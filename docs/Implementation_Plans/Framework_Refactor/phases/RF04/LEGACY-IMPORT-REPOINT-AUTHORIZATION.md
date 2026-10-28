# Owner authorization — mechanical legacy test import repointing

On 2026-10-28 the owner selected **Allow import-only repointing** for existing `bot/scripts/*-test.mjs` when an implementation moves to its owning framework.

This narrow amendment permits changing import paths only, while preserving test bodies and assertions. It does not authorize executing those legacy suites, reusing historical fixtures or goldens for fresh qualification, deleting supported readers without reverse-caller review, or changing gameplay, saved formats, baseline/deadline policy or release status. Fresh changed-code tests and exact source/caller evidence remain required.
