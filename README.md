<div align="center">
<h1>bill.ooo</h1>
</div>

A collaborative expense sharing Progressive Web App (PWA) that works offline and syncs across devices.

## Features

- 📱 Works on all devices (PWA)
- 🔄 Real-time sync between users
- 📊 Smart expense splitting
- 💰 Category-wise expense tracking
- 🔌 Works offline
- 🔗 Easy group sharing via links
- 🎯 Simplified debt resolution

## Quick Start

1. Clone the repository
```bash
git clone https://github.com/hemangsk/billooo.git
cd billooo
```

2. Serve the files using any HTTP server (e.g., using Python)
```bash
python -m http.server 8000
```

3. Open in your browser
```
http://localhost:8000
```

## Usage Guide

### Setting Up Your Profile
1. Open the app
2. Enter your name and email
3. Your profile will be saved locally

### Creating a Group
1. Click "New Group"
2. Enter group name
3. Click "Create Group"

### Inviting Friends with QR Code
1. Open your group
2. Click "Invite Friends"
3. A dialog will appear with a unique invite link and QR code
4. Share the link or let your friends scan the QR code
5. Links expire after 24 hours

### Adding Expenses
1. Select your group
2. Fill in expense details:
   - Description
   - Amount
   - Category
3. Click "Add Expense"

### Viewing Balances
- Group balances are automatically calculated
- See who owes what
- View category-wise breakdowns
- Get simplified settlement suggestions

## Technical Details

### Architecture
- Pure JavaScript (No frameworks)
- CRDT-based data synchronization
- P2P communication using PeerJS
- PWA for offline functionality
- LocalStorage for persistence

### Files Structure
```
billooo/
├── index.html
├── manifest.json
├── sw.js
├── src/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js
│       ├── crdt.js
│       ├── peer-manager.js
│       └── expense-calculator.js
```

### Key Components
- `crdt.js`: Handles data synchronization
- `peer-manager.js`: Manages P2P connections
- `expense-calculator.js`: Expense splitting logic
- `app.js`: Main application logic

## Development

### Prerequisites
- Modern web browser
- Basic HTTP server

### Local Development
1. Clone the repository
2. Serve the files using any HTTP server
3. Open in browser
4. Changes are immediately reflected

### Building for Production
1. Update the `manifest.json` with your app details
2. Generate icons in required sizes
3. Update the service worker cache version
4. Deploy to HTTPS-enabled server

## Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge
- Any modern browser with PWA support

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
MIT License - feel free to use and modify

## Support
- Open an issue for bugs
- Submit PRs for improvements
- Contact: hemangsk@gmail.com

## Roadmap
- [ ] Add multi-currency support
- [ ] Implement receipt scanning
- [ ] Add expense categories customization
- [ ] Enable group expense analytics
- [ ] Add push notifications

## Acknowledgments
- PeerJS for P2P functionality
- CRDT concept for sync
- PWA technology
