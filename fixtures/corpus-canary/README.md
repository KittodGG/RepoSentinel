# corpus-canary

Synthetic repository used as the positive control for the external corpus gate.
Every secret below is fabricated and has never been valid anywhere.

## Install

```bash
npm install corpus-canary
```

Every file here must stay tracked. The planted secrets are the detection
floor for the external corpus gate; if one stops being committed the gate
loses its positive control. `.gitignore` carries a negation for this tree.
