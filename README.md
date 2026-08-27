# Soundrobe: AI-Powered Music Discovery

**Live**: [soundrobe.vercel.app](https://soundrobe.vercel.app/)

An intelligent music discovery and playlist management platform that learns from your listening habits to generate personalized recommendations and curated playlists.

## Overview

Soundrobe transforms how people discover music by combining real-time listening data, user preferences, and ML-powered recommendation algorithms to surface songs tailored to individual taste and mood.

## Features

### 🎵 Music Recommendation Engine
- **Personalized Recommendations**: ML-based system that learns from your listening history, likes, and skips
- **Mood-Based Playlists**: Auto-generate playlists tailored to activities (focus, workout, relaxation)
- **Discovery Modes**: Explore new artists, genres, and sounds based on your base preferences
- **Real-Time Integration**: Live updates to recommendations as you listen

### 👤 User Profile & Taste Profile
- **Taste Summary**: Visual representation of your music preferences (genres, moods, decades)
- **Listening Stats**: Track top artists, tracks, and listening patterns
- **Genre Breakdown**: Understand your musical diversity
- **Listening History**: Full archive of your music discovery journey

### 🎧 Now Playing & Queue Management
- **Live Now Playing**: Real-time display of current track with rich metadata
- **Smart Queue**: Intelligent up-next suggestions
- **Interaction Tracking**: Likes, skips, and replays inform future recommendations
- **Collaborative Listening**: Share playlists and recommendations with friends

### 🎨 UI/UX
- **Sleek, Modern Interface**: Responsive design optimized for web and mobile
- **Interactive Components**: Smooth interactions with profile info and recommendation cards
- **Real-Time Updates**: Live sync across all user interactions

## Tech Stack

- **Frontend**: Next.js 14 (TypeScript), React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Real-Time**: Supabase Real-time subscriptions
- **Components**: Custom UI component library
- **Testing**: Comprehensive unit and integration tests
- **Deployment**: Vercel

## Architecture
```bash
soundrobe/
├── app/ # Next.js app directory
├── components/ # React components
│ └── ui/ # Reusable UI components
├── lib/ # Utility functions & helpers
├── types/ # TypeScript type definitions
├── supabase/ # Database migrations & config
├── tests/ # Unit & integration tests
├── docs/ # Documentation
├── scripts/ # Build & utility scripts
└── public/ # Static assets
```


## Key Algorithms

### Recommendation Engine
- **Content-Based Filtering**: Analyzes song features (genre, tempo, mood, artist)
- **Collaborative Filtering**: Learns from aggregate user behavior patterns
- **Hybrid Approach**: Combines content and collaborative signals for accuracy
- **Cold Start Handling**: Smart onboarding recommendations for new users

### Personalization
- **Taste Evolution**: Tracks how preferences change over time
- **Context Awareness**: Adjusts recommendations based on time-of-day, activity
- **Diversity Balancing**: Ensures recommendations balance familiarity with discovery

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Jandresol/soundrobe.git
cd soundrobe

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

## Development
```bash
# Run tests
npm run test

# Lint code
npm run lint

# Build for production
npm run build

# Start production server
npm run start
```

## Deployment
Soundrobe is deployed on Vercel for optimal performance and fast edge computing.

```bash
vercel deploy
```

## API Endpoints
GET /api/recommendations - Get personalized recommendations
POST /api/profile/taste - Update taste profile
PUT /api/now-playing - Update currently playing track
GET /api/playlists - Fetch user playlists
POST /api/playlists - Create new playlist
Database Schema
Key tables:

users - User profiles and authentication
listening_history - Track all user listening events
songs - Song metadata and features
playlists - User-created playlists
recommendations - Cached recommendation results
user_preferences - Explicit user taste preferences
