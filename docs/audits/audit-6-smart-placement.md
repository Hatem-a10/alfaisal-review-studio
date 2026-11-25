# Staging Smart Placement experiment

Staging uses Cloudflare Workers Smart Placement (`placement.mode: smart`) to allow the platform to place compute nearer data dependencies. The production config is unchanged. Smart Placement is an experiment, not a claim of a measured performance gain.

After an authorized staging deployment, compare matched request samples for `/api/progress`, `/api/materials` and ordinary static navigation before and after, using Worker analytics and observed response latency. Check error rate, CPU time and tail latency separately. Allow placement to settle before interpreting results. Roll back by removing the staging placement property and redeploying a reviewed commit if regressions are observed. Do not promote this setting without owner approval and evidence.
