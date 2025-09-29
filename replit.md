# Overview

This is a multiplayer drawing and guessing game built as a full-stack web application. Players join rooms using unique codes, take turns drawing and guessing prompts in a telephone game format, and earn points for accurate guesses. The game supports multiple game modes (normal, secret, score, masterpiece) and generates animated GIF sequences showing the evolution of drawings and guesses throughout each game chain.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: React 18 with TypeScript, using Vite as the build tool and development server.

**UI Component System**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling. The design uses a dark theme with custom color variables for consistency.

**Routing**: Wouter for client-side routing with the following main routes:
- `/` - Home page for creating/joining rooms
- `/lobby/:code` - Room lobby before game starts
- `/game/:roomId` - Active game interface with drawing canvas
- `/results/:roomId` - Post-game results and chain visualization

**State Management**: 
- TanStack Query (React Query) for server state management and API data fetching
- Local React hooks for UI state
- Custom hooks for game state (`useGameState`), WebSocket connections (`useWebSocket`), and mobile detection

**Drawing Canvas**: Fabric.js integration through a custom `FabricCanvas` class providing:
- Multiple drawing tools (brush, pencil, eraser, shapes, text, fill bucket)
- Layer management and blend modes
- Filter/effects system
- Canvas export to JSON and image formats

**Real-time Communication**: WebSocket integration for:
- Live drawing updates
- Phase transitions
- Player status changes
- Room synchronization

## Backend Architecture

**Server Framework**: Express.js with TypeScript running on Node.js.

**API Design**: RESTful endpoints for:
- Room creation and management (`/api/rooms`)
- Player operations
- Drawing and guess submissions
- Game chain retrieval

**WebSocket Server**: Standalone WebSocket server for real-time game events using the `ws` library. Manages connection lifecycle, room broadcasting, and message routing.

**Session Management**: Stateful connections tracked in-memory with Maps storing connection metadata (player ID, room ID, socket reference).

**Development Setup**: 
- Vite middleware integration for HMR in development
- Custom error overlay and logging
- Replit-specific plugins for development environment

## Data Storage

**Primary Storage**: In-memory storage implementation (`MemStorage` class) using Maps for:
- Rooms and their configurations
- Players and their states
- Drawings with canvas data
- Guesses and prompts
- Game chains tracking the progression of prompts→drawings→guesses

**Database Schema** (via Drizzle ORM): 
- Configured for PostgreSQL using Neon serverless driver
- Schema definitions use Zod for validation
- Migration system through drizzle-kit
- Database URL from environment variables

**Data Models**:
- **Room**: Stores game configuration, current phase, rounds, player list, settings
- **Player**: Name, avatar, score, status, host flag, socket ID
- **Drawing**: Canvas JSON, image URL, round number, player reference
- **Guess**: Text guess, associated drawing, player reference
- **GameChain**: Tracks complete sequence of prompts/drawings/guesses for result visualization

**Storage Interface**: Abstract `IStorage` interface allows switching between in-memory and persistent database storage without changing business logic.

## External Dependencies

**UI Framework**:
- React 18 and React DOM
- Wouter for routing
- TanStack Query for data fetching

**UI Components**:
- Radix UI primitives (30+ component packages)
- Tailwind CSS for styling with PostCSS
- Class Variance Authority and clsx for conditional styling
- Lucide React for icons

**Drawing & Graphics**:
- Fabric.js for canvas manipulation
- Custom GIF exporter for game sequence animations
- HTML5 Canvas API

**Real-time Communication**:
- WebSocket (ws library) for server
- Native WebSocket API for client

**Database & ORM**:
- Drizzle ORM for type-safe database queries
- @neondatabase/serverless for PostgreSQL connection
- Drizzle-zod for schema validation
- Drizzle-kit for migrations

**Form & Validation**:
- React Hook Form with Zod resolvers
- Zod for schema validation

**Development Tools**:
- Vite with React plugin
- TypeScript 5+
- ESBuild for production builds
- Replit-specific plugins (cartographer, dev-banner, runtime-error-modal)

**Date Handling**: date-fns for date formatting and manipulation

**Session Storage**: connect-pg-simple for PostgreSQL-backed sessions (configured but using in-memory for now)

**Build & Deployment**:
- Development: tsx for running TypeScript server
- Production: ESBuild bundles server, Vite builds client
- Static assets served from dist/public