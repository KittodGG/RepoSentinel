// Positive-control fixture for the external corpus gate.
//
// Every value below is deliberately malformed for its real provider: each tail
// carries a hyphen and a "canary" marker, so upstream secret scanners reject
// them as invalid while RepoSentinel's prefix detectors still fire. That keeps
// the gate's detection floor intact without shipping anything a scanner would
// have to treat as a live credential.
export const github = "ghp_canary-0000000000000000000000invalid";
export const stripe = "sk_live_canary-0000000000000000000invalid";
export const google = "AIzacanary-0000000000000000000000invalid";
export const openai = "sk-proj-canary-0000000000000000000invalid";
export const npmToken = "npm_canary-0000000000000000000000invalid";
export const aws = "AKIACANARY-000000INVALID";
export const slack = "xoxb-canary-0000000000-000000000invalid";
export const database =
  "postgres://canaryuser:Zq7Wm2Kd9Rt4Yx8P@db.invalid:5432/canary";
