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
{"content":[{"attrs":{"localId":"bc0fcb08faf0"},"content":[{"text":"Issue:","type":"text"}],"type":"paragraph"},{"attrs":{"localId":"d5283f563595"},"content":[{"text":"In our backend configuration, we’ve set the maximum file size that can be retrieved to be 10MB. However recently, BUs have reported that some customers are uploading file sizes of 10~12MB, causing them to be blocked from uploading their files.","type":"text"}],"type":"paragraph"},{"attrs":{"localId":"8f00120ca1ab"},"type":"paragraph"},{"attrs":{"localId":"2ca2c28fc294"},"content":[{"text":"To fix: Increase the maximum file size limit per file to 15MB","type":"text"}],"type":"paragraph"},{"attrs":{"localId":"bc0fcb08faf0"},"type":"paragraph"},{"attrs":{"localId":"bc0fcb08faf0"},"content":[{"text":"Steps to reproduce:","type":"text"}],"type":"paragraph"},{"attrs":{"localId":"936990c22f1f","order":1},"content":[{"attrs":{"localId":"b5bb09b0273e"},"content":[{"attrs":{"localId":"58c6ce22fa27"},"content":[{"text":"Open Account Commercial Personal/Company Flow","type":"text"}],"type":"paragraph"}],"type":"listItem"},{"attrs":{"localId":"b5bb09b0273e"},"content":[{"attrs":{"localId":"33cff34a2398"},"content":[{"text":"Proceed all the way to Upload Files section","type":"text"}],"type":"paragraph"}],"type":"listItem"},{"attrs":{"localId":"b5bb09b0273e"},"content":[{"attrs":{"localId":"a9d21539762d"},"content":[{"text":"Scan QR Code","type":"text"}],"type":"paragraph"}],"type":"listItem"},{"attrs":{"localId":"b5bb09b0273e"},"content":[{"attrs":{"localId":"1e5549ffa0de"},"content":[{"text":"For Documentary of Proof of Occupancy, upload a single file > 10MB in size","type":"text"}],"type":"paragraph"}],"type":"listItem"}],"type":"orderedList"},{"attrs":{"localId":"df79ad532bd7"},"content":[{"text":"Expectation:","type":"text"}],"type":"paragraph"},{"attrs":{"localId":"34e23175c4bd"},"content":[{"attrs":{"localId":"5171e891d3d1"},"content":[{"attrs":{"localId":"8d170fe7cc18"},"content":[{"text":"User should be able to upload file >10 MB in size","type":"text"}],"type":"paragraph"}],"type":"listItem"}],"type":"bulletList"},{"attrs":{"localId":"e2950254bf4b"},"content":[{"text":"Actual:","type":"text"}],"type":"paragraph"},{"attrs":{"localId":"8cb91985818b"},"content":[{"attrs":{"localId":"c40227cc4747"},"content":[{"attrs":{"localId":"7b19e726a431"},"content":[{"text":"User is blocked from uploading file > 10MB in size, with an error message.","type":"text"},{"type":"hardBreak"},{"type":"hardBreak"},{"type":"hardBreak"},{"text":"[AGENT]","type":"text"},{"type":"hardBreak"},{"marks":[{"type":"strong"}],"text":"Context","type":"text"},{"text":": In our backend configuration, we’ve set the maximum file size that can be retrieved to be 10MB. However recently, User have reported that some customers are uploading file sizes of 10~12MB, causing them to be blocked from uploading their files.","type":"text"},{"type":"hardBreak"},{"text":"Expectation: Increase upload file size to 15MB - Ensure file upload success when upload 3 files at time each file ~ 15MB","type":"text"},{"type":"hardBreak"},{"type":"hardBreak"},{"text":"Strategy:","type":"text"},{"type":"hardBreak"},{"text":"- khaos-api: Increase upload file size to 15, increase request payload size, check the validation for file upload","type":"text"}],"type":"paragraph"}],"type":"listItem"}],"type":"bulletList"}],"type":"doc","version":1}