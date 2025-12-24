// Anthropic Claude AI Integration for FamBam
// Uses Claude Haiku for fast, cost-effective AI features

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

// Get API key from environment
const getApiKey = () => {
  return import.meta.env.VITE_ANTHROPIC_API_KEY || ''
}

// Base function to call Claude API
async function callClaude(systemPrompt, userMessage, options = {}) {
  const apiKey = getApiKey()

  if (!apiKey) {
    console.warn('Anthropic API key not configured')
    return null
  }

  const {
    maxTokens = 256,
    temperature = 0.7,
  } = options

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-20250414',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ],
        temperature
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Claude API error:', error)
      return null
    }

    const data = await response.json()
    return data.content[0]?.text || null
  } catch (error) {
    console.error('Error calling Claude:', error)
    return null
  }
}

// ============================================
// POST PROMPT SUGGESTIONS
// Help users think of things to share
// ============================================

const POST_PROMPT_SYSTEM = `You are a friendly family connection assistant for FamBam, an app that helps families stay connected. Your job is to suggest engaging, warm conversation starters that encourage family members to share updates.

Guidelines:
- Keep suggestions warm, positive, and family-friendly
- Focus on everyday moments, not just big events
- Encourage storytelling and sharing feelings
- Be concise - one sentence suggestions
- Vary between questions, prompts, and ideas
- Consider different family dynamics (parents, kids, grandparents, siblings)

Return exactly 3 suggestions, one per line, no numbering or bullets.`

export async function getPostPrompts(context = {}) {
  const { recentTopics = [], dayOfWeek = '', userName = '' } = context

  let userMessage = 'Generate 3 post prompts for a family member to share.'

  if (dayOfWeek) {
    userMessage += ` It's ${dayOfWeek}.`
  }
  if (recentTopics.length > 0) {
    userMessage += ` Recent family posts were about: ${recentTopics.join(', ')}.`
  }
  if (userName) {
    userMessage += ` The user's name is ${userName}.`
  }

  const result = await callClaude(POST_PROMPT_SYSTEM, userMessage, {
    maxTokens: 200,
    temperature: 0.8
  })

  if (!result) {
    // Fallback prompts if API fails
    return [
      "What made you smile today?",
      "Share a photo of something you're working on",
      "What's one thing you're looking forward to this week?"
    ]
  }

  return result.split('\n').filter(line => line.trim()).slice(0, 3)
}

// ============================================
// COMMENT SUGGESTIONS
// Help users engage with family posts
// ============================================

const COMMENT_SYSTEM = `You are helping a family member respond to another family member's post on FamBam. Generate warm, engaging comment suggestions that feel personal and supportive.

Guidelines:
- Be warm and encouraging
- Show genuine interest
- Ask follow-up questions when appropriate
- Keep comments concise (under 15 words each)
- Vary the tone: supportive, curious, celebratory, empathetic
- Never be generic - reference the actual content

Return exactly 3 comment suggestions, one per line, no numbering.`

export async function getCommentSuggestions(postContent, postAuthor) {
  const userMessage = `Post by ${postAuthor}: "${postContent}"

Generate 3 comment suggestions for responding to this family post.`

  const result = await callClaude(COMMENT_SYSTEM, userMessage, {
    maxTokens: 150,
    temperature: 0.7
  })

  if (!result) {
    return [
      "Love this! Tell me more!",
      "This made my day!",
      "So happy to see this!"
    ]
  }

  return result.split('\n').filter(line => line.trim()).slice(0, 3)
}

// ============================================
// WEEKLY DIGEST SUMMARY
// Summarize family activity
// ============================================

const DIGEST_SYSTEM = `You are creating a warm, engaging weekly digest for a family using FamBam. Summarize the week's activity in a way that celebrates connection and highlights moments.

Guidelines:
- Be warm and celebratory
- Highlight specific members and their contributions
- Note themes or patterns in sharing
- Keep it concise but personal
- End with something encouraging
- Use a conversational, family-friendly tone

Format:
- 2-3 short paragraphs
- Mention specific names when possible
- Include a fun stat or observation`

export async function generateWeeklyDigest(weekData) {
  const {
    posts = [],
    topContributors = [],
    totalReactions = 0,
    totalComments = 0,
    familyName = 'your family'
  } = weekData

  const postSummaries = posts.slice(0, 10).map(p =>
    `${p.authorName}: "${p.message?.slice(0, 50) || p.contentType + ' post'}"`
  ).join('\n')

  const userMessage = `Create a weekly digest for ${familyName}.

This week's stats:
- ${posts.length} posts shared
- ${totalReactions} reactions given
- ${totalComments} comments made
- Top contributors: ${topContributors.join(', ') || 'Everyone participated!'}

Recent posts:
${postSummaries || 'No posts this week'}

Generate a warm, engaging weekly summary.`

  const result = await callClaude(DIGEST_SYSTEM, userMessage, {
    maxTokens: 350,
    temperature: 0.7
  })

  return result || `Great week for ${familyName}! Keep the connections going.`
}

// ============================================
// CHALLENGE SUGGESTIONS
// Personalized challenge recommendations
// ============================================

const CHALLENGE_SYSTEM = `You are suggesting personalized family connection challenges. Based on the user's activity, recommend which challenges would be most meaningful for them.

Guidelines:
- Consider what they haven't done recently
- Encourage variety in connection types
- Be specific about why each challenge fits
- Keep explanations brief (one sentence each)

Return challenge recommendations in format:
CHALLENGE_NAME: Brief reason why`

export async function getChallengeRecommendations(userActivity) {
  const {
    completedChallenges = [],
    recentPosts = [],
    daysSinceLastCall = null,
    userName = ''
  } = userActivity

  const userMessage = `User: ${userName || 'Family member'}
Recently completed: ${completedChallenges.join(', ') || 'None yet'}
Recent post types: ${recentPosts.join(', ') || 'None'}
${daysSinceLastCall !== null ? `Days since last family call: ${daysSinceLastCall}` : ''}

Suggest 3 challenges from this list that would be most meaningful:
- Call a family member
- Share a photo update
- Share a vlog update
- Share a video highlight
- Reply to a post
- Share a memory
- Plan a future visit
- Share good news
- Celebrate a win
- Weekend plans check-in
- Share what you're grateful for`

  const result = await callClaude(CHALLENGE_SYSTEM, userMessage, {
    maxTokens: 200,
    temperature: 0.6
  })

  return result || null
}

// ============================================
// PHOTO CAPTION SUGGESTIONS
// Help with captions for photo posts
// ============================================

const CAPTION_SYSTEM = `You are helping a family member write a caption for a photo they're sharing with family. Generate warm, personal caption suggestions.

Guidelines:
- Keep captions short and sweet (under 10 words)
- Be warm and family-appropriate
- Vary between descriptive, emotional, and playful
- Don't use hashtags
- Make it feel genuine, not generic

Return exactly 3 caption options, one per line.`

export async function getCaptionSuggestions(context = '') {
  const userMessage = context
    ? `Suggest 3 captions for a family photo. Context: ${context}`
    : 'Suggest 3 captions for a family photo being shared.'

  const result = await callClaude(CAPTION_SYSTEM, userMessage, {
    maxTokens: 100,
    temperature: 0.8
  })

  if (!result) {
    return [
      "Making memories!",
      "Thought you'd enjoy this",
      "Just a little moment from today"
    ]
  }

  return result.split('\n').filter(line => line.trim()).slice(0, 3)
}

// ============================================
// VOICE NOTE TRANSCRIPTION SUMMARY
// Summarize voice note content
// ============================================

const VOICE_SUMMARY_SYSTEM = `You are summarizing a family voice note transcription. Create a brief, warm summary that captures the key message.

Guidelines:
- Keep summary to 1-2 sentences
- Capture the emotion and main point
- Be warm and personal
- Don't include filler words or um/ah from transcript`

export async function summarizeVoiceNote(transcription) {
  if (!transcription) return null

  const userMessage = `Summarize this family voice note: "${transcription}"`

  return await callClaude(VOICE_SUMMARY_SYSTEM, userMessage, {
    maxTokens: 100,
    temperature: 0.5
  })
}

// Check if AI features are available
export function isAIEnabled() {
  return !!getApiKey()
}
