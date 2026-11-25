# Isolated browser smoke

The GitHub workflow builds the staging candidate and starts a loopback-only HTTPS Worker with generated synthetic credentials, disposable local D1/R2 bindings, and no Cloudflare deployment credentials. Chromium desktop and WebKit mobile-sized browsers exercise sign-in, dashboard rendering, available calendar navigation, anonymous private API denial and page-level overflow. This supplements unit tests, not physical iPhone/iPad Safari acceptance or Clerk Production verification. Browser dependencies are pinned and installed separately from the application lockfile.
