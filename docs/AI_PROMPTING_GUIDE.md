# FamBam AI Prompting Guide

This guide covers how AI is integrated into FamBam using Anthropic's Claude Haiku model, and how to customize prompts for different features.

## Overview

FamBam uses Claude Haiku for:
- **Post Prompts**: Help users think of things to share
- **Comment Suggestions**: Encourage engagement with family posts
- **Weekly Digests**: Summarize family activity
- **Challenge Recommendations**: Personalized challenge suggestions
- **Photo Captions**: Help with caption ideas
- **Voice Note Summaries**: Summarize audio transcriptions

## Setup

1. Get an API key from [Anthropic Console](https://console.anthropic.com/)
2. Add to your `.env` file:
```
VITE_ANTHROPIC_API_KEY=your-api-key-here
```

## Model Selection

We use **Claude Haiku** (`claude-haiku-4-20250414`) for all features because:
- Fast response times (< 1 second)
- Cost-effective for high-volume usage
- Sufficient capability for suggestion/summary tasks
- Good at following formatting instructions

For more complex tasks (e.g., detailed family stories), consider upgrading to Sonnet.

---

## Prompt Patterns

### 1. Post Prompt Suggestions

**Purpose**: Help users overcome "blank page" syndrome when sharing updates.

**System Prompt Structure**:
```
Role: Family connection assistant
Task: Generate conversation starters
Guidelines:
- Warm, positive tone
- Focus on everyday moments
- Encourage storytelling
- One sentence each
- Vary topics
Output: 3 suggestions, one per line
```

**Customization Tips**:
- Add seasonal context: "It's holiday season..."
- Include family events: "The family recently celebrated..."
- Consider time of day: "It's evening, suggest wind-down prompts"

**Example Prompts by Scenario**:

| Scenario | Sample Output |
|----------|--------------|
| Weekend | "What adventure did you have today?" |
| Monday | "What are you looking forward to this week?" |
| Evening | "What was the best part of your day?" |
| After silence | "We miss you! Share what you've been up to" |

### 2. Comment Suggestions

**Purpose**: Reduce friction in engaging with family posts.

**System Prompt Structure**:
```
Role: Comment helper
Task: Generate supportive responses
Guidelines:
- Warm and encouraging
- Show genuine interest
- Ask follow-up questions
- Under 15 words each
- Reference actual content
Output: 3 options, one per line
```

**Context Variables**:
- `postContent`: The text of the post
- `postAuthor`: Who wrote it
- `contentType`: photo/video/text/audio
- `relationship`: (optional) parent/sibling/grandparent

**Good vs Bad Comments**:

| ❌ Generic | ✅ Contextual |
|-----------|--------------|
| "Nice!" | "That sunset is gorgeous! Where was this?" |
| "Love it" | "You look so happy! What's the occasion?" |
| "Great" | "I can hear the excitement in your voice!" |

### 3. Weekly Digest

**Purpose**: Celebrate family connection and encourage continued engagement.

**System Prompt Structure**:
```
Role: Family digest writer
Task: Summarize week's activity
Guidelines:
- Warm and celebratory
- Highlight specific members
- Note themes/patterns
- Concise but personal
- End with encouragement
Format: 2-3 paragraphs
```

**Data to Include**:
- Post count and types
- Top contributors
- Total reactions/comments
- Notable moments
- Streaks or milestones

**Sample Output**:
```
What a wonderful week for the Johnson family! Mom led the way
with 5 posts, sharing everything from her garden progress to
that hilarious video of Dad trying to use the new coffee maker.

The kids kept everyone laughing with their creative photo dumps,
and Grandma's voice note about her trip to the farmer's market
got the most reactions of the week!

Keep the connections coming - you're building memories that matter.
```

### 4. Challenge Recommendations

**Purpose**: Personalized suggestions based on user activity.

**System Prompt Structure**:
```
Role: Challenge recommender
Task: Suggest meaningful challenges
Guidelines:
- Consider recent activity
- Encourage variety
- Explain why each fits
- Brief explanations
Output: CHALLENGE: Reason format
```

**Personalization Factors**:
- Challenges already completed this week
- Content types they typically share
- Time since last family call
- Their family role (parent, child, etc.)

### 5. Photo Captions

**Purpose**: Quick, warm captions for photo shares.

**System Prompt Structure**:
```
Role: Caption writer
Task: Family-friendly photo captions
Guidelines:
- Short (under 10 words)
- Warm and personal
- No hashtags
- Genuine, not generic
Output: 3 options, one per line
```

**Context Options**:
- Occasion (birthday, holiday, random)
- Who's in the photo
- Location/activity
- Mood (silly, sentimental, proud)

---

## Prompt Engineering Best Practices

### 1. Be Specific About Format
```
❌ "Give me some suggestions"
✅ "Return exactly 3 suggestions, one per line, no numbering"
```

### 2. Set the Tone
```
❌ "Write a comment"
✅ "Write a warm, encouraging comment that shows genuine interest"
```

### 3. Provide Context
```
❌ "Suggest a caption"
✅ "Suggest a caption for a photo of kids playing in the backyard on a sunny day"
```

### 4. Use Constraints
```
❌ "Write a short response"
✅ "Keep response under 15 words"
```

### 5. Include Examples (Few-Shot)
```
For reference, good captions look like:
- "Sunday vibes with my favorite people"
- "Making memories, one laugh at a time"
- "This is what happiness looks like"
```

---

## Temperature Settings

| Feature | Temperature | Reasoning |
|---------|------------|-----------|
| Post Prompts | 0.8 | More creative/varied |
| Comments | 0.7 | Balanced creativity |
| Digests | 0.7 | Engaging but accurate |
| Challenges | 0.6 | More consistent logic |
| Captions | 0.8 | Creative variety |
| Summaries | 0.5 | Accurate, less creative |

---

## Error Handling

Always provide fallbacks when AI is unavailable:

```javascript
const result = await getPostPrompts()

// Fallback if API fails
if (!result || result.length === 0) {
  return [
    "What made you smile today?",
    "Share a photo of something you're working on",
    "What's one thing you're looking forward to?"
  ]
}
```

---

## Rate Limiting & Costs

### Haiku Pricing (as of 2024)
- Input: $0.25 / million tokens
- Output: $1.25 / million tokens

### Estimated Usage Per User
| Feature | Calls/Week | Tokens/Call | Weekly Cost |
|---------|-----------|-------------|-------------|
| Post Prompts | 10 | ~300 | $0.004 |
| Comments | 20 | ~200 | $0.005 |
| Captions | 5 | ~150 | $0.001 |
| **Total** | 35 | - | **~$0.01/user/week** |

### Rate Limit Recommendations
- Cache prompt suggestions for 5 minutes
- Limit AI calls to 50/user/day
- Use debouncing on suggestion requests

---

## Future Enhancements

1. **Conversation Threading**: AI-suggested follow-up questions based on comment threads
2. **Memory Features**: "This time last year..." prompts using historical data
3. **Relationship-Aware**: Different suggestions for parents vs. siblings vs. grandparents
4. **Emotion Detection**: Adjust tone based on detected sentiment in posts
5. **Multi-Language**: Support for families who speak different languages

---

## Testing Prompts

Use this template to test new prompts:

```javascript
import { callClaude } from './ai'

const testPrompt = async () => {
  const result = await callClaude(
    `Your system prompt here`,
    `Your user message here`,
    { maxTokens: 200, temperature: 0.7 }
  )
  console.log(result)
}
```

Run in browser console or create a test page at `/test-ai`.
