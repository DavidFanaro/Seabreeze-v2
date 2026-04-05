## Important Notes
- this is using a development build.

## Important Rules
- when building any UI use the `frontend-design` and `building-native-ui` skill 
- when interacting with ai sdk use the `ai-sdk` skill
- When using the in-app chat feature, use the Apple provider/model only unless explicitly instructed otherwise.
- check if there is a currently opened dev server if not then start one. BUT ONLY IF ONE IS NOT ALREADY RUNNING

## Important behaviors
- Be very willing to do searches for documentation and web searches. You should not be holding back on searches whatsoever.
- When building UIs make sure to use the React best practices and front end design skills in order to avoid AI slop looking user interfaces. Be creative; don't just go with something safe. 
- Use TanStackQuery as much as possible when doing any kind of requests that can fail or can take a while through some async requests.

## Tooling Tips
- Docs lookup: use Context7 tools when needed.
- Web info: use SearXNG mcp tools.
- GitHub search: use `gh_grep` tools.
- iOS simulator: use `agent-device` skill.

## WHEN TESTING YOUR CHANGES IN THE SIMULATOR 
- Use the `agent-device` skill to control the simulator
- Aways use the `expo start --clear` command to start the dev server
- Use the r - reload app command in the expo dev server to reload the app
- DO NOT USE npm run ios!!!!!!!!!!
