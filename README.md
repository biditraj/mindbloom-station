# MindBloom Station

A modern mental health and mood tracking application built with React, TypeScript, and Supabase.

## Features

- **Mood Tracking**: Daily mood check-ins with AI-powered sentiment analysis
- **Insights Dashboard**: Personalized recommendations based on mood patterns
- **Analytics**: Visual mood statistics and trend analysis
- **User Authentication**: Secure email/password based registration and login
- **Admin Dashboard**: Institutional-level analytics for administrators
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: Tailwind CSS, Radix UI, Lucide Icons
- **Backend**: Supabase (Authentication, Database, Real-time)
- **AI/ML**: Custom mood analysis models
- **State Management**: React Context API with custom hooks
- **Routing**: React Router v6

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mindbloom-station
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

### Database Setup

Run the database migrations in your Supabase project:

1. Set up the initial schema:
```sql
-- Run migrations from supabase/migrations/ in order
```

2. Apply the latest migration to remove legacy features:
```sql
-- Run 20250828000000_remove_anonymous_features.sql
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (shadcn/ui)
│   ├── MoodTracker.tsx # Main mood tracking component
│   ├── InsightsPanel.tsx # AI insights display
│   └── Layout.tsx      # Application layout
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication state
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and AI models
├── pages/              # Page components
└── integrations/       # External service integrations
    └── supabase/       # Supabase client and types
```

## Features

### Mood Tracking
- Interactive emoji-based mood selection
- Optional text notes for context
- Real-time AI sentiment analysis
- Automatic stress level detection

### AI Insights
- Personalized recommendations based on mood patterns
- Stress level analysis and coping strategies
- Trend identification and wellness tips

### Analytics
- Mood history visualization
- Statistical analysis of mood patterns
- Progress tracking over time

### User Management
- Secure authentication with Supabase Auth
- User profiles with customizable information
- Role-based access control (student/admin)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the GitHub repository.
