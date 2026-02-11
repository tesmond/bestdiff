# Best Diff

A Git diff reviewing tool built as a cross-platform desktop application. Best Diff will provide a side-by-side diff viewer with advanced features like virtual scrolling, smart scroll synchronization, and curved connectors for visualizing changes.

## Features

- **Side-by-Side Diff Viewing**: Compare file changes with clear visual indicators
- **Virtual Scrolling**: Efficiently handle large diffs with performance-optimized rendering
- **Smart Scroll Sync**: Lines scroll at different rates to keep unchanged content aligned (similar to JetBrains IDEs)
- **Curved Connectors**: SVG-based visual links between changed lines
- **File List Management**: Organize staged and unstaged changes
- **Git Integration**: Direct integration with Git commands for staging, unstaging, and committing
- **Cross-Platform**: Runs on Windows, macOS, and Linux using Electrobun

## Technologies

- **Electrobun**: Cross-platform desktop app framework
- **React**: UI framework for responsive components
- **Vite**: Fast build tool with hot module replacement
- **Tailwind CSS**: Utility-first CSS framework
- **TypeScript**: Type-safe development
- **Vitest**: Unit testing framework

## Installation

### Prerequisites

- [Bun](https://bun.sh/) runtime
- Git

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd bestdiff
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Run in development mode:
   ```bash
   bun run dev:hmr
   ```

   Or without hot reload:
   ```bash
   bun run dev
   ```

## Usage

1. Launch the application
2. Open a workspace: File > Open Workspace, select a Git repository directory
3. The left pane shows the list of changed files, split into Staged Changes and Changes
4. Select a file to view the diff in the right pane
5. Use the stage/unstage buttons to move files between groups
6. Add a commit message in the top text box
7. Click Commit to commit staged changes

### Key Features

- **Scroll Synchronization**: As you scroll, the left and right panes adjust speeds to align unchanged lines
- **Visual Connectors**: Curved lines connect related changes between panes
- **Highlighting**: Added lines in blue, removed lines in red

## Development

### Scripts

- `bun run dev:hmr`: Start development with hot module replacement
- `bun run dev`: Start development without HMR
- `bun run build`: Build for production
- `bun run test`: Run unit tests
- `bun run test:watch`: Run tests in watch mode

### Project Structure

```
src/
├── bun/                # Main process (Electrobun/Bun)
├── mainview/           # React frontend
│   ├── components/     # UI components
│   ├── stores/         # State management
│   └── utils/          # Utilities
└── shared/             # Shared types and utilities
```

### Testing

Run tests with:
```bash
bun run test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.