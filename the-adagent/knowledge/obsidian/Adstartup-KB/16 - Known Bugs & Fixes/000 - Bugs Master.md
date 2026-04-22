---
tags: [adstartup, bugs, critical]
---

# 🐛 Known Bugs & Fixes

## BUG-001 — Duplicate Messages
**Cause:** Webhook retry

```js
const msgId = req.body.message.id;
if (processedMessages.has(msgId)) return res.status(200).send('dup');
processedMessages.add(msgId);
```

---

## BUG-002 — Responding to Own Messages

```js
if (msg.fromMe === true) return;
```

---

## BUG-003 — Context Mixing Between Clients

```js
const convId = msg.from; // "201012345678@c.us"
const history = await getHistory(convId);
```

---

## BUG-004 — Out-of-Scope Responses

**Prompt fix:**
> If question outside Adstartup scope → "ده مش من اختصاصي — عايزك أوصلك للشخص الصح؟"

---

## BUG-005 — Formal Arabic (فصحى)

**Prompt fix:**
> ALWAYS Egyptian dialect. NEVER فصحى.
> Good: "تمام، هشرحلك." | Bad: "بالتأكيد، سأوضح."

---

## BUG-006 — Reply Before Context Loads

**Correct order:**
1. Receive message
2. Load history
3. Retrieve KB chunk
4. Build prompt
5. LLM response
6. Send reply
7. Save to history

---

## BUG-007 — Escalation Not Triggering

```js
const esc = ['عايز حد','تكلم معايا','مدير','مش كويس','شكوى'];
if (esc.some(k => msg.toLowerCase().includes(k))) triggerEscalation();
```

---

## BUG-008 — Responding in Group Chats

```js
if (msg.isGroup) return;
```

---
*[[🏠 Home]] · [[000 - System Prompt Master]]*
