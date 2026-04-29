# Task: EKSK-1828

## Target Projects Detected:
- khaos-api

## SYSTEM PROMPT INSTRUCTIONS
You are Antigravity, executing the AM Workflow. You must follow these steps strictly:

### STEP 2: Parse Context
Read the raw Jira Description JSON at the bottom of this file. Focus heavily on the `[AGENT]` section if it exists. Intelligently extract and write out:
1. **Problem**
2. **Required Work**
3. **Expected Outcome**

### STEP 3: Question & Research Loop
If you have any questions or ambiguity regarding the architecture, requirements, or dependencies:
- Use your tools to search Jira and Confluence.
- If unresolved, ask the human.
- Do NOT proceed to Step 5 until all ambiguity is resolved.

### STEP 5: Implement Solution
Implement the code across the Target Projects listed above.

### STEP 6: Antigravity Code Review
Once implemented, review your own code for edge cases, performance, and best practices. Fix any issues found.

### STEP 8: Iteration
If the Human reviewer tells you the code is NOT good, update the code and repeat the review.

---

## Jira Raw Description JSON
{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"Issue:"}],"attrs":{"localId":"bc0fcb08faf0"}},{"type":"paragraph","content":[{"type":"text","text":"In our backend configuration, we’ve set the maximum file size that can be retrieved to be 10MB. However recently, BUs have reported that some customers are uploading file sizes of 10~12MB, causing them to be blocked from uploading their files."}],"attrs":{"localId":"d5283f563595"}},{"type":"paragraph","attrs":{"localId":"8f00120ca1ab"}},{"type":"paragraph","content":[{"type":"text","text":"To fix: Increase the maximum file size limit per file to 15MB"}],"attrs":{"localId":"2ca2c28fc294"}},{"type":"paragraph","attrs":{"localId":"bc0fcb08faf0"}},{"type":"paragraph","content":[{"type":"text","text":"Steps to reproduce:"}],"attrs":{"localId":"bc0fcb08faf0"}},{"type":"orderedList","attrs":{"order":1,"localId":"936990c22f1f"},"content":[{"type":"listItem","attrs":{"localId":"b5bb09b0273e"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Open Account Commercial Personal/Company Flow"}],"attrs":{"localId":"58c6ce22fa27"}}]},{"type":"listItem","attrs":{"localId":"b5bb09b0273e"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Proceed all the way to Upload Files section"}],"attrs":{"localId":"33cff34a2398"}}]},{"type":"listItem","attrs":{"localId":"b5bb09b0273e"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Scan QR Code"}],"attrs":{"localId":"a9d21539762d"}}]},{"type":"listItem","attrs":{"localId":"b5bb09b0273e"},"content":[{"type":"paragraph","content":[{"type":"text","text":"For Documentary of Proof of Occupancy, upload a single file > 10MB in size"}],"attrs":{"localId":"1e5549ffa0de"}}]}]},{"type":"paragraph","content":[{"type":"text","text":"Expectation:"}],"attrs":{"localId":"df79ad532bd7"}},{"type":"bulletList","content":[{"type":"listItem","attrs":{"localId":"5171e891d3d1"},"content":[{"type":"paragraph","content":[{"type":"text","text":"User should be able to upload file >10 MB in size"}],"attrs":{"localId":"8d170fe7cc18"}}]}],"attrs":{"localId":"34e23175c4bd"}},{"type":"paragraph","content":[{"type":"text","text":"Actual:"}],"attrs":{"localId":"e2950254bf4b"}},{"type":"bulletList","content":[{"type":"listItem","attrs":{"localId":"c40227cc4747"},"content":[{"type":"paragraph","content":[{"type":"text","text":"User is blocked from uploading file > 10MB in size, with an error message."},{"type":"hardBreak"}],"attrs":{"localId":"7b19e726a431"}}]}],"attrs":{"localId":"8cb91985818b"}},{"type":"paragraph","content":[{"type":"text","text":"[AGENT]"},{"type":"hardBreak"},{"type":"text","text":"Context","marks":[{"type":"strong"}]},{"type":"text","text":": In our backend configuration, we’ve set the maximum file size that can be retrieved to be 10MB. However recently, User have reported that some customers are uploading file sizes of 10~12MB, causing them to be blocked from uploading their files. "},{"type":"hardBreak"},{"type":"hardBreak"},{"type":"text","text":"Expectation: Increase upload file size to 15MB - Ensure file upload success when upload 3 files at time each file ~ 15MB Strategy: "},{"type":"hardBreak"},{"type":"text","text":"- khaos-api: Increase upload file size to 15, increase request payload size, check the validation for file upload"}],"attrs":{"localId":"874a9c5642a8"}}]}