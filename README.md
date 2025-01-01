
<div align="center">

<img src="src-tauri/icons/icon-128.png">

<h1>Tauri Media Player</h1>

![Tauri](https://img.shields.io/badge/tauri-%2324C8DB.svg?style=for-the-badge&logo=tauri&logoColor=%23FFFFFF)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/rust-%23000000.svg?style=for-the-badge&logo=rust&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Windows](https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)

A modern, media player built with Tauri, React, and MPV. Designed with video and music playback in mind.

An experimental project exploring Rust FFI and dynamic library by creating a modern GUI wrapper for MPV. This project explores interfacing with C libraries in Rust while building a practical media player application with a clean, modern interface using Tauri and React.

Currently available for Windows only.

<!-- <video width="100%" controls>
  <source src="demo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video> -->

<img src="docs/demo.png">

</div>

## 🚀 Features

-   🎵 Advanced media playback using MPV
-   📱 Modern UI with shadcn/ui components
-   🎨 Beautiful design with Tailwind CSS
-   📋 Playlist management with drag-and-drop support
-   🎮 Hardware-accelerated video playback
-   📁 Support for various media formats

## 🛠️ Tech Stack

-   **Frontend**: React + TypeScript
-   **UI Components**: shadcn/ui (based on Radix UI)
-   **Styling**: Tailwind CSS
-   **State Management**: Nanostores
-   **Backend**: Tauri (Rust)
-   **Media Engine**: MPV (via FFI)
-   **Database**: SQLite with Drizzle ORM and migrations with Drizzle Kit
-   **Build Tool**: Vite

## 🔧 Prerequisites

-   Windows 10 or later

## 📦 Installation

1. Download the latest release from the [Releases page](https://github.com/yourusername/tauri-media-player/releases)
2. Run the installer
3. Follow the installation wizard

## 💻 Development Setup

If you want to contribute or build from source:

1. Prerequisites:

    - Node.js (v20 or higher)
    - Rust (latest stable)
    - Cargo (Rust package manager)
    - Git

2. Clone and setup:
    ```bash
    git clone https://github.com/yourusername/tauri-media-player.git
    cd tauri-media-player
    pnpm install
    ```

3. Ensure the dynamic library files are in `src-tauri\lib\` (i.e. `src-tauri\lib\mpv\libmpv-2.dll` exists)

4. Start development server:
    ```bash
     pnpm run tauri dev
    ```

5. Build for production:
    ```bash
    pnpm run tauri build
    ```

## 🔌 FFI Integration

This project uses Rust FFI (Foreign Function Interface) to integrate with MPV player. Here's how it works:

1. **MPV Integration**: The application uses `libmpv` through Rust's FFI capabilities. This allows direct communication with MPV's C API from Rust code.

2. **Architecture**:
    - Rust side: Uses `libloading` to dynamically load MPV libraries
    - FFI bindings: Custom safe wrappers around unsafe MPV functions
    - Event handling: Async event loop for MPV events in Rust
    - Windows management: MPV is mounted onto a child application window controlled by a proxy HTML element.

## 📝 License

This project is licensed under the GPL-2.0 license - see the [LICENSE](LICENSE) file for details.
