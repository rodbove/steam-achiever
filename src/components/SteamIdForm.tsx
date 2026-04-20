'use client';

import { useState } from 'react';

interface Props {
  onSubmit: (steamId: string, useLlm: boolean) => void;
  loading: boolean;
  initialId?: string;
}

export function SteamIdForm({ onSubmit, loading, initialId = '' }: Props) {
  const [id, setId] = useState(initialId);
  const [useLlm, setUseLlm] = useState(true);

  const valid = /^\d{17}$/.test(id.trim());

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !loading) onSubmit(id.trim(), useLlm);
      }}
      className="space-y-4"
    >
      <div>
        <label className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-ink/60">
          your steamID64 (17 digits)
        </label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="76561198000000000"
          className="w-full border-2 border-ink bg-bone px-4 py-3 font-mono text-lg tracking-wider focus:border-ember focus:outline-none"
        />
        <p className="mt-1.5 text-xs text-ink/55">
          not your vanity name. find yours at{' '}
          <a
            href="https://steamid.io"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-ember decoration-2 underline-offset-2 hover:text-ember"
          >
            steamid.io
          </a>
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 border border-ink/20 bg-ink/[0.02] p-3">
        <input
          type="checkbox"
          checked={useLlm}
          onChange={(e) => setUseLlm(e.target.checked)}
          className="mt-1 h-4 w-4 accent-ember"
        />
        <span className="text-sm">
          <span className="font-medium">refine top picks with AI</span>
          <span className="ml-2 font-mono text-[11px] uppercase tracking-wider text-ink/50">
            optional
          </span>
          <br />
          <span className="text-ink/60">
            uses Anthropic API to estimate time/difficulty more accurately. needs
            ANTHROPIC_API_KEY in .env.local. costs a few cents per fresh load.
          </span>
        </span>
      </label>

      <button
        type="submit"
        disabled={!valid || loading}
        className="w-full bg-ink py-4 font-display text-lg font-medium uppercase tracking-wider text-bone transition-all hover:bg-ember disabled:cursor-not-allowed disabled:bg-ink/30"
      >
        {loading ? 'hunting...' : 'load my library'}
      </button>
    </form>
  );
}
