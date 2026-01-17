# Draft Master - Technical Architecture 🏗️

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Data Flow](#data-flow)
6. [AI Integration](#ai-integration)
7. [Database Schema](#database-schema)
8. [API Design](#api-design)
9. [Security](#security)
10. [Performance Optimization](#performance-optimization)
11. [Deployment](#deployment)
12. [Monitoring & Observability](#monitoring--observability)

---

## System Overview

Draft Master is a modern web application built with a **serverless-first architecture**, leveraging edge computing and AI services to deliver real-time draft assistance.

### Core Principles
- **Serverless**: No infrastructure management, auto-scaling
- **Edge-first**: Deploy close to users for minimal latency
- **API-driven**: Clean separation of concerns
- **Type-safe**: End-to-end TypeScript
- **Real-time**: Sub-second response times

### Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                       │
├─────────────────────────────────────────────────────────┤
│ Next.js 16 (App Router) + React 19 + TypeScript         │
│ Tailwind CSS + shadcn/ui + Framer Motion                │
│ Zustand (State) + React Hook Form + Zod (Validation)    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                     API LAYER                            │
├─────────────────────────────────────────────────────────┤
│ Next.js API Routes (Serverless Functions)               │
│ Edge Runtime + Middleware                                │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   SERVICES LAYER                         │
├─────────────────────────────────────────────────────────┤
│ Cerebras AI (Recommendations) + GRID API (Statistics)   │
│ Vercel KV (Caching) + PostgreSQL (User Data)            │
└─────────────────────────────────────────────────────────┘
```

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                           CLIENT                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              Browser / Mobile App                       │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │     │
│  │  │   UI Layer   │  │  State Mgmt  │  │   Routing   │ │     │
│  │  │  (React)     │  │  (Zustand)   │  │  (Next.js)  │ │     │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │     │
│  └────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS
┌──────────────────────────────────────────────────────────────────┐
│                        CDN / EDGE                                 │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              Vercel Edge Network                        │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │     │
│  │  │   Static     │  │  Middleware  │  │    Cache    │ │     │
│  │  │   Assets     │  │   (Auth)     │  │   (Redis)   │ │     │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │     │
│  └────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                      API GATEWAY                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │           Next.js API Routes (Serverless)              │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │     │
│  │  │  /api/ai/    │  │  /api/grid/  │  │ /api/user/  │ │     │
│  │  │  recommend   │  │  statistics  │  │   profile   │ │     │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │     │
│  └────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Cerebras AI │  │   GRID API   │  │  Champion    │          │
│  │  (LLM)       │  │  (Esports)   │  │  Data Svc    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │  Vercel KV   │  │  Static JSON │          │
│  │  (User Data) │  │  (Cache)     │  │  (Champions) │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Component Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Home page (redirects to /draft)
│   ├── draft/
│   │   └── page.tsx            # Main draft page
│   └── api/                     # API routes
│       ├── ai/
│       │   └── recommend/
│       │       └── route.ts    # AI recommendation endpoint
│       └── grid/
│           ├── players/
│           ├── teams/
│           └── statistics/
│
├── features/                     # Feature-based modules
│   └── draft/
│       ├── components/          # React components
│       │   ├── draft-board.tsx
│       │   ├── champion-grid.tsx
│       │   ├── recommendation-panel.tsx
│       │   ├── synergy-display.tsx
│       │   └── draft-results-modal.tsx
│       ├── hooks/               # Custom React hooks
│       │   ├── use-draft.ts
│       │   ├── use-recommendations.ts
│       │   └── use-team-search.ts
│       ├── services/            # Business logic
│       │   ├── draft-engine.ts
│       │   ├── champion-data.ts
│       │   ├── cerebras-ai.ts
│       │   ├── grid-api.ts
│       │   └── cache.ts
│       ├── types/               # TypeScript types
│       │   └── index.ts
│       └── data/                # Static data
│           ├── champions.json
│           └── synergies.json
│
├── components/                   # Shared UI components
│   ├── ui/                      # shadcn/ui components
│   └── layout/                  # Layout components
│
└── lib/                         # Utility functions
    ├── utils.ts
    └── format.ts
```

### State Management

**Zustand Store Pattern**

```typescript
// Draft State Store
interface DraftStore {
  // State
  draftState: DraftState | null;
  allChampions: Champion[];
  availableChampions: Champion[];
  selectedChampion: Champion | null;

  // Actions
  startDraft: (userSide: 'blue' | 'red') => void;
  pick: (champion: Champion) => void;
  ban: (champion: Champion) => void;
  selectChampion: (champion: Champion | null) => void;
  confirmAction: () => void;
  reset: () => void;
}

// Usage: Automatic re-renders on state changes
const { draftState, pick, ban } = useDraft();
```

### Component Patterns

**1. Container/Presenter Pattern**
```typescript
// Container (Smart Component)
export default function DraftPage() {
  const { draftState, pick, ban } = useDraft();
  const { recommendations } = useRecommendations({ draftState });
  
  return <DraftBoard draftState={draftState} onPick={pick} onBan={ban} />;
}

// Presenter (Dumb Component)
export function DraftBoard({ draftState, onPick, onBan }) {
  return <div>{/* Pure UI rendering */}</div>;
}
```

**2. Custom Hooks Pattern**
```typescript
// Encapsulate complex logic
export function useRecommendations({ draftState, enabled }) {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!enabled) return;
    fetchRecommendations(draftState).then(setRecommendations);
  }, [draftState, enabled]);
  
  return { recommendations, isLoading };
}
```

---

## Backend Architecture

### API Routes Structure

```typescript
// /api/ai/recommend/route.ts
export async function POST(request: Request) {
  try {
    // 1. Parse and validate request
    const body = await request.json();
    const validated = recommendationSchema.parse(body);
    
    // 2. Check cache
    const cached = await cache.get(cacheKey);
    if (cached) return Response.json(cached);
    
    // 3. Call AI service
    const recommendations = await cerebrasAI.getRecommendations(validated);
    
    // 4. Cache result
    await cache.set(cacheKey, recommendations, { ttl: 300 });
    
    // 5. Return response
    return Response.json(recommendations);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### Service Layer Pattern

```typescript
// services/cerebras-ai.ts
export class CerebrasAIService {
  private client: Cerebras;
  private cache: CacheService;
  
  async getRecommendations(context: DraftContext): Promise<Recommendation[]> {
    // 1. Build prompt
    const prompt = this.buildPrompt(context);
    
    // 2. Call AI with retry logic
    const response = await this.callWithRetry(() =>
      this.client.chat.completions.create({
        model: 'llama3.1-8b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      })
    );
    
    // 3. Parse and validate response
    const recommendations = this.parseResponse(response);
    
    return recommendations;
  }
  
  private async callWithRetry(fn: () => Promise<any>, maxRetries = 3) {
    // Exponential backoff retry logic
  }
}
```

---

## Data Flow

### Draft Flow Sequence

```
User Action → State Update → UI Re-render → API Call → Service → Response → Cache → UI Update

1. User clicks champion
   ↓
2. useDraft().selectChampion(champion)
   ↓
3. Zustand updates selectedChampion state
   ↓
4. React re-renders UI with selection highlight
   ↓
5. User clicks "Pick" button
   ↓
6. useDraft().confirmAction()
   ↓
7. Draft engine validates action
   ↓
8. State updated with new pick
   ↓
9. useRecommendations() detects state change
   ↓
10. API call to /api/ai/recommend
    ↓
11. Check cache for existing recommendations
    ↓
12. If miss, call Cerebras AI service
    ↓
13. Parse AI response
    ↓
14. Cache result (5 min TTL)
    ↓
15. Return recommendations to client
    ↓
16. Update UI with new recommendations
```

### Real-time Updates

```typescript
// Optimistic UI Updates
const pick = async (champion: Champion) => {
  // 1. Immediately update UI (optimistic)
  set({ draftState: applyPick(draftState, champion) });
  
  try {
    // 2. Sync with server (if needed)
    await api.saveDraft(draftState);
  } catch (error) {
    // 3. Rollback on error
    set({ draftState: previousState });
    toast.error('Failed to save pick');
  }
};
```

---

## AI Integration

### Cerebras AI Architecture

```typescript
// AI Request Flow
┌─────────────────────────────────────────────────────────┐
│                    Client Request                        │
│  { draftState, userSide, opponentTeam }                 │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                  Prompt Engineering                      │
│  - Context building (current picks/bans)                │
│  - Role definition (strategic advisor)                  │
│  - Output format specification (JSON)                   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                  Cerebras API Call                       │
│  Model: llama3.1-8b                                     │
│  Temperature: 0.7 (balanced creativity)                 │
│  Max Tokens: 1000                                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                  Response Processing                     │
│  - JSON parsing                                         │
│  - Validation (Zod schema)                              │
│  - Champion ID mapping                                  │
│  - Score normalization                                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                  Client Response                         │
│  [{ champion, score, reason }, ...]                     │
└─────────────────────────────────────────────────────────┘
```

### Prompt Template

```typescript
const RECOMMENDATION_PROMPT = `
You are a professional League of Legends draft analyst.

Current Draft State:
- Phase: ${phase}
- User Side: ${userSide}
- Blue Picks: ${bluePicks.map(c => c.name).join(', ')}
- Red Picks: ${redPicks.map(c => c.name).join(', ')}
- Bans: ${bans.map(c => c.name).join(', ')}

Task: Recommend ${actionType === 'pick' ? '5 champions to pick' : '3 champions to ban'}

Consider:
1. Team composition and synergies
2. Counter-picks to opponent team
3. Current meta strength
4. Role coverage

Respond in JSON format:
{
  "recommendations": [
    {
      "championName": "string",
      "score": number (0-100),
      "reason": "string (max 100 chars)"
    }
  ]
}
`;
```

---

## Database Schema

### Future Schema (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  tier VARCHAR(20) DEFAULT 'free', -- free, pro, team
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Draft sessions
CREATE TABLE draft_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  user_side VARCHAR(4) NOT NULL, -- blue, red
  phase VARCHAR(20) NOT NULL,
  blue_picks JSONB DEFAULT '[]',
  red_picks JSONB DEFAULT '[]',
  blue_bans JSONB DEFAULT '[]',
  red_bans JSONB DEFAULT '[]',
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- AI recommendations log
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES draft_sessions(id),
  phase VARCHAR(20) NOT NULL,
  recommendations JSONB NOT NULL,
  accepted_champion VARCHAR(50),
  response_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User preferences
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  favorite_champions JSONB DEFAULT '[]',
  preferred_roles JSONB DEFAULT '[]',
  notification_settings JSONB DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_draft_sessions_user ON draft_sessions(user_id);
CREATE INDEX idx_draft_sessions_created ON draft_sessions(created_at DESC);
CREATE INDEX idx_ai_recommendations_session ON ai_recommendations(session_id);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
```

---

## API Design

### RESTful Endpoints

```typescript
// AI Recommendations
POST /api/ai/recommend
Request: {
  draftState: DraftState,
  actionType: 'pick' | 'ban',
  userSide: 'blue' | 'red'
}
Response: {
  recommendations: Recommendation[],
  reasoning: string
}

// GRID Statistics
GET /api/grid/teams?search=T1
Response: {
  teams: Team[]
}

GET /api/grid/statistics?teamId=xxx&timeWindow=LAST_3_MONTHS
Response: {
  statistics: TeamStatistics
}

GET /api/grid/players?teamId=xxx
Response: {
  players: Player[]
}

// User Management (Future)
GET /api/user/profile
POST /api/user/preferences
GET /api/user/drafts
POST /api/user/drafts
```

### Error Handling

```typescript
// Standardized error response
interface APIError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  status: number;
}

// Example
{
  "error": {
    "code": "AI_SERVICE_ERROR",
    "message": "Failed to generate recommendations",
    "details": {
      "retries": 3,
      "lastError": "Rate limit exceeded"
    }
  },
  "status": 503
}
```

---

## Security

### API Security

```typescript
// Rate Limiting (Vercel Edge Config)
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  
  // Process request
}
```

### Input Validation

```typescript
import { z } from 'zod';

const recommendationSchema = z.object({
  draftState: z.object({
    phase: z.enum(['ban_1', 'pick_1', /* ... */]),
    bluePicks: z.array(championSchema),
    redPicks: z.array(championSchema),
    // ...
  }),
  actionType: z.enum(['pick', 'ban']),
  userSide: z.enum(['blue', 'red'])
});

// Usage
const validated = recommendationSchema.parse(requestBody);
```

### Environment Variables

```bash
# Required
CEREBRAS_API_KEY=xxx
GRID_API_KEY=xxx

# Optional
NEXT_PUBLIC_APP_URL=https://draftmaster.app
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Security
API_SECRET_KEY=xxx
RATE_LIMIT_ENABLED=true
```

---

## Performance Optimization

### Caching Strategy

```typescript
// Multi-layer caching
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Browser Cache (Static Assets)                  │
│ - Champions data: 24 hours                              │
│ - Images: 7 days                                        │
│ - CSS/JS: Immutable (hash-based)                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: CDN Cache (Vercel Edge)                       │
│ - API responses: 5 minutes                              │
│ - Static pages: 1 hour                                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Redis Cache (Vercel KV)                       │
│ - AI recommendations: 5 minutes                         │
│ - GRID statistics: 1 hour                               │
│ - User sessions: 24 hours                               │
└─────────────────────────────────────────────────────────┘
```

### Code Splitting

```typescript
// Dynamic imports for heavy components
const DraftResultsModal = dynamic(
  () => import('@/features/draft/components/draft-results-modal'),
  { loading: () => <Skeleton /> }
);

// Route-based code splitting (automatic with Next.js App Router)
app/
  draft/
    page.tsx        // Separate bundle
  profile/
    page.tsx        // Separate bundle
```

### Image Optimization

```typescript
// Next.js Image component
import Image from 'next/image';

<Image
  src="/champions/ahri.png"
  alt="Ahri"
  width={64}
  height={64}
  loading="lazy"
  placeholder="blur"
/>

// Automatic optimization:
// - WebP/AVIF conversion
// - Responsive sizes
// - Lazy loading
```

---

## Deployment

### Vercel Deployment

```yaml
# vercel.json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1", "sfo1", "fra1"], # US East, West, EU
  "env": {
    "CEREBRAS_API_KEY": "@cerebras-api-key",
    "GRID_API_KEY": "@grid-api-key"
  }
}
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Monitoring & Observability

### Metrics to Track

```typescript
// Performance Metrics
- Page Load Time (target: <2s)
- Time to Interactive (target: <3s)
- API Response Time (target: <500ms)
- AI Inference Time (target: <2s)

// Business Metrics
- Drafts per User
- AI Recommendation Acceptance Rate
- Feature Usage
- Conversion Rate

// Error Metrics
- Error Rate (target: <0.1%)
- API Failure Rate
- AI Service Uptime
```

### Logging Strategy

```typescript
// Structured logging
logger.info('AI recommendation generated', {
  sessionId: 'xxx',
  phase: 'pick_1',
  responseTime: 1234,
  recommendationCount: 5,
  accepted: false
});

// Error tracking
logger.error('AI service failed', {
  error: error.message,
  stack: error.stack,
  context: { draftState, retries: 3 }
});
```

---

## Future Enhancements

### Planned Architecture Improvements

1. **WebSocket Integration**
   - Real-time multiplayer drafts
   - Live coaching sessions
   - Team collaboration

2. **GraphQL API**
   - More flexible data fetching
   - Reduced over-fetching
   - Better mobile performance

3. **Microservices**
   - Separate AI service
   - Dedicated analytics service
   - Independent scaling

4. **Machine Learning Pipeline**
   - Custom model training
   - A/B testing framework
   - Continuous model improvement

5. **Mobile Apps**
   - React Native apps
   - Shared business logic
   - Native performance

---

## Conclusion

Draft Master's architecture is designed for:
- **Scalability**: Serverless auto-scaling
- **Performance**: Edge computing + caching
- **Reliability**: Retry logic + fallbacks
- **Maintainability**: Clean separation of concerns
- **Developer Experience**: Type-safety + modern tooling

The architecture supports rapid iteration while maintaining production-grade quality and performance.
