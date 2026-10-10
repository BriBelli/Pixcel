import { getDb } from '../../../lib/db';
import { checkCap, recordUsage } from '../../../lib/db/usage';
import { runVideoAgent, type VideoAgentEvent } from '../../../lib/agents/video-agent';
import { DEV_USER_ID, type Asset, type Interaction, type Thread } from '../../../lib/db/models';
import { promoteThreadForAsset } from '../../../lib/db/project-promotion';
import { ingestMedia } from '../../../lib/db/media-store';
import { runLiveChain } from '../../../lib/engine/chain-runner';

export const runtime = 'nodejs';
/** Video renders are 75-120s per model and a fan runs them concurrently. */
export const maxDuration = 600;

const newId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * POST /api/video-agent — the Video workspace's own endpoint.
 *
 * Until now the Video nav routed to `runImageAgent` wearing a video badge: the doctrine, formulas and
 * task vocabulary built for video were read by nothing, and a shot was planned as though it were a
 * picture. This is the seam that ends that.
 *
 * Two legs, mirroring the image route: a CONSULTATION plans the shot and streams back a builder
 * block; a RENDER dispatches through the video coordinator and streams the job lifecycle (queued →
 * generating → clip), because a 100-second render with no signal is indistinguishable from a hang.
 *
 * Spend is gated BEFORE any work: the user's remaining budget is the ceiling handed to the agent, and
 * a render that would exceed it is refused whole rather than quietly shrunk.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    prompt?: string;
    thread_id?: string;
    user_id?: string;
    /** Present → RENDER now (the user committed from the builder). */
    render_prompt?: string;
    shot?: {
      durationSec?: number;
      resolution?: string;
      aspectRatio?: string;
      audio?: boolean;
      models?: string[];
      fanModels?: number;
      perModel?: number;
      /** Pinned frames + guiding references. The client has always sent these (framesToRequest
       *  spreads them into `shot`); typing them is what lets the lineage edges below be built. */
      startFrame?: string;
      endFrame?: string;
      /** Stills pinned to a moment inside the shot, in seconds. */
      keyframes?: { url: string; atSec: number }[];
      references?: string[];
    };
    /**
     * APPROVED CHAIN — the user saw the agent's proposed beats and the price, and said go. Present
     * → run the chain instead of a single render. Never inferred from the agent's proposal alone:
     * N beats is N renders, and that spend is the user's to authorize.
     */
    beats?: { prompt?: string; durationSec?: number }[];
  };

  const prompt = (body.prompt ?? '').trim();
  const renderPrompt = (body.render_prompt ?? '').trim();
  const goal = renderPrompt || prompt;
  const userId = (body.user_id ?? '').trim() || DEV_USER_ID;
  const encoder = new TextEncoder();

  if (!goal) {
    return Response.json({ error: 'A prompt is required.' }, { status: 400 });
  }

  const db = await getDb();

  // ── SPEND GATE ────────────────────────────────────────────────────────────────────────────────
  // Video is ~50x an image per render, so this is checked before anything is planned, and the
  // REMAINING budget becomes the agent's ceiling rather than a fixed guess.
  let remainingUsd: number | undefined;
  try {
    const cap = await checkCap(db, userId);
    remainingUsd = cap.remaining_usd;
    if (!cap.allowed) {
      const blocked = new ReadableStream({
        start(c) {
          c.enqueue(
            encoder.encode(
              JSON.stringify({
                type: 'gen_error',
                message: `Budget reached — $${cap.spent_usd.toFixed(2)} of $${cap.cap_usd.toFixed(2)} spent. Raise your budget to keep generating.`,
              }) + '\n',
            ),
          );
          c.close();
        },
      });
      return new Response(blocked, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
  } catch (err) {
    console.warn('[video-agent] cap check failed, continuing:', err);
  }

  // Ensure a thread so the work is never orphaned.
  const now = Date.now();
  let threadId = (body.thread_id ?? '').trim();
  try {
    const existing = threadId ? await db.get('thread', threadId) : null;
    if (!existing) {
      threadId = threadId || newId('thread');
      await db.put({
        id: threadId,
        user_id: userId,
        category: 'thread',
        status: 'active',
        created_at: now,
        updated_at: now,
        title: goal.slice(0, 40),
      } as Thread);
    }
  } catch (err) {
    console.warn('[video-agent] thread ensure failed:', err);
    threadId = threadId || newId('thread');
  }

  const interactionId = newId('interaction');

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      let agentText = '';
      let inTok = 0;
      let outTok = 0;
      let genCost = 0;
      let block: unknown = null;
      /** Delivered clips, kept so they can be PERSISTED — see the asset block below. */
      const clips: {
        url: string;
        modelId: string;
        modelLabel: string;
        index: number;
        durationSec?: number;
        hasAudio?: boolean;
        thumbnailUrl?: string;
        /** For a chained beat: the still it opened on — the edge back to the previous beat. */
        openedOn?: string;
      }[] = [];

      // ── PERSIST AS IT LANDS ───────────────────────────────────────────────────────────────────
      // Clips used to be written only AFTER the whole stream finished, which was fine for a single
      // 90-second render and catastrophic for a chain: a 2-beat chain runs ~10 minutes, hits this
      // route's maxDuration, and the process dies holding every clip it produced. That is exactly
      // what happened on the first live run — beat 1 rendered, was paid for, and was never written
      // down. "Partial results are kept" is a promise the orchestrator cannot keep alone; the write
      // has to happen at the moment the clip exists.
      const refAssetIds: string[] = [];
      let refsPersisted = false;
      let prevClipAssetId: string | undefined;
      const clipAssetIds: string[] = [];

      /** Persist ONE clip the instant it arrives. Never throws — a failed write must not kill the run. */
      const persistClipNow = async (clip: (typeof clips)[number], costUsd?: number): Promise<void> => {
        try {
          // The user's own pinned frames/references — once, before the first clip.
          if (!refsPersisted) {
            refsPersisted = true;
            const refUrls = [body.shot?.startFrame, body.shot?.endFrame, ...(body.shot?.references ?? [])]
              .filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
            for (let i = 0; i < refUrls.length; i++) {
              const refId = newId('asset');
              const refStored = await ingestMedia(refUrls[i]!);
              await db.put({
                id: refId, user_id: userId, category: 'asset', status: 'active',
                created_at: now, updated_at: now, kind: 'image', source: 'upload',
                retention: 'ephemeral', thread_id: threadId, interaction_id: interactionId,
                url: refStored.url, index: i,
              } as Asset);
              refAssetIds.push(refId);
            }
          }

          // The bridging still is a real input that produced this clip — persisted so the lineage
          // edge resolves to something rather than a provider url that has since expired.
          const bridgeIds: string[] = [];
          if (clip.openedOn) {
            const bridge = await ingestMedia(clip.openedOn);
            const bridgeId = newId('asset');
            await db.put({
              id: bridgeId, user_id: userId, category: 'asset', status: 'active',
              created_at: now, updated_at: Date.now(), kind: 'image', source: 'generated',
              retention: 'ephemeral', thread_id: threadId, interaction_id: interactionId,
              url: bridge.url, model_label: 'Bridging frame', index: clip.index,
            } as Asset);
            bridgeIds.push(bridgeId);
          }

          const stored = await ingestMedia(clip.url);
          if (!stored.stored) {
            console.warn(`[video-agent] could not store the clip: ${stored.reason} — keeping the provider url, which WILL expire`);
          }
          const poster = clip.thumbnailUrl ? await ingestMedia(clip.thumbnailUrl) : null;

          const assetId = newId('asset');
          await db.put({
            id: assetId, user_id: userId, category: 'asset', status: 'active',
            created_at: now, updated_at: Date.now(), kind: 'video', source: 'generated',
            retention: 'ephemeral', thread_id: threadId, interaction_id: interactionId,
            url: stored.url,
            model: clip.modelId,
            model_label: clip.modelLabel || undefined,
            index: clip.index,
            prompt: goal,
            gen_cost_usd: costUsd,
            duration_sec: clip.durationSec,
            has_audio: clip.hasAudio,
            thumbnail_url: poster?.url ?? clip.thumbnailUrl,
            reference_asset_ids: [...refAssetIds, ...bridgeIds].length > 0 ? [...refAssetIds, ...bridgeIds] : undefined,
            // A CHAIN is a lineage CHAIN: beat 2's parent is beat 1, because beat 2 literally opens
            // on the frame beat 1 ended with.
            parent_asset_id: clip.openedOn ? prevClipAssetId : undefined,
          } as Asset);
          clipAssetIds.push(assetId);
          prevClipAssetId = assetId;
          await promoteThreadForAsset(db, threadId, now).catch(() => {});
        } catch (err) {
          console.warn('[video-agent] clip persist failed:', err);
        }
      };

      // ── APPROVED CHAIN ────────────────────────────────────────────────────────────────────────
      // The user saw the agent's proposed beats and the price and said go. This does NOT run the
      // agent again: the beats are already decided, and re-planning here would spend tokens to
      // second-guess a decision the user has made. Straight to the renders.
      const approvedBeats = (body.beats ?? [])
        .map((b) => ({ prompt: (b?.prompt ?? '').trim(), durationSec: b?.durationSec }))
        .filter((b) => b.prompt.length > 0);

      if (approvedBeats.length >= 2) {
        for await (const ev of runLiveChain({
          beats: approvedBeats,
          modelId: (body.shot?.models ?? [])[0] ?? 'seedance-2.5',
          resolution: body.shot?.resolution,
          aspectRatio: body.shot?.aspectRatio,
          audio: body.shot?.audio,
          startFrame: body.shot?.startFrame,
          budgetUsd: remainingUsd,
          defaultDurationSec: body.shot?.durationSec,
        })) {
          if (ev.type === 'clip') {
            genCost = Number((genCost + ev.clip.costUsd).toFixed(3));
            clips.push({
              url: ev.clip.url,
              modelId: (body.shot?.models ?? [])[0] ?? 'seedance-2.5',
              modelLabel: (body.shot?.models ?? [])[0] ?? 'seedance-2.5',
              index: ev.clip.index,
              durationSec: ev.clip.durationSec,
              hasAudio: ev.clip.hasAudio,
              // The still this beat opened on IS the lineage edge to the previous beat.
              openedOn: ev.clip.openedOn,
            });
            // Written down NOW, not at the end of the stream — a chain outlives this route.
            await persistClipNow(clips[clips.length - 1]!, ev.clip.costUsd);
          }
          send(ev);
        }
        // Fall through to the SAME persist + meter block a single render uses — a chained clip is an
        // asset like any other, and must not need its own half-implemented copy of that logic.
      } else {
      try {
        for await (const ev of runVideoAgent(
          { goal, subject: goal, budgetUsd: remainingUsd },
          { userMessage: prompt, renderPrompt: renderPrompt || undefined, shot: body.shot },
        ) as AsyncGenerator<VideoAgentEvent>) {
          if (ev.type === 'agent_text') agentText += ev.delta;
          else if (ev.type === 'agent_usage') {
            inTok += ev.inputTokens;
            outTok += ev.outputTokens;
          } else if (ev.type === 'agent_a2ui') block = ev.block;
          else if (ev.type === 'clip') {
            clips.push(ev);
            await persistClipNow(ev);
          }
          else if (ev.type === 'gen_done') genCost += ev.costUsd;
          send(ev);
        }
      } catch (err) {
        send({ type: 'gen_error', message: err instanceof Error ? err.message : 'The video agent failed.' });
      }
      }

      // Persist + meter. Generation spend counts toward the cap exactly like image spend, so a video
      // run cannot slip past a budget that images respect.
      try {
        await db.put({
          id: interactionId,
          user_id: userId,
          category: 'interaction',
          status: 'active',
          created_at: now,
          updated_at: Date.now(),
          thread_id: threadId,
          model: 'video-agent',
          prompt: { text: goal },
          response: { text: agentText, tokens_used: outTok, a2ui: block, a2ui_version: 1 },
        } as unknown as Interaction);
        await recordUsage(db, {
          user_id: userId,
          interaction_id: interactionId,
          input_tokens: inTok,
          output_tokens: outTok,
          gen_cost_usd: genCost,
        });
        await db.update('thread', threadId, {});

        // Clips are ALREADY persisted — each one was written the moment it arrived (see
        // persistClipNow). All that is left is attributing spend to them, which needs the total the
        // stream only knows at the end. Best-effort on purpose: the asset already exists, and a
        // missing cost figure is a far smaller loss than a missing creation.
        if (clipAssetIds.length > 0 && genCost > 0) {
          const share = Number((genCost / clipAssetIds.length).toFixed(4));
          for (const id of clipAssetIds) {
            const existing = (await db.get('asset', id)) as Asset | null;
            if (existing && existing.gen_cost_usd == null) {
              await db.update<Asset>('asset', id, { gen_cost_usd: share });
            }
          }
        }

      } catch (err) {
        console.warn('[video-agent] persist failed:', err);
      }

      send({ type: 'done', thread_id: threadId });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
