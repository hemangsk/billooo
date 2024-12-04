class PeerManager {
    constructor(onDataReceived) {
        this.peers = new Map(); // Connected peers
        this.connections = new Map(); // Active connections
        this.onDataReceived = onDataReceived;
        this.peerId = null;
        this.initializePeer();
    }

    async initializePeer() {
        this.peer = new Peer({
            debug: 2,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        this.peer.on('open', (id) => {
            this.peerId = id;
            document.getElementById('my-id').textContent = `Your ID: ${id}`;
        });

        this.peer.on('connection', (conn) => {
            this.handleConnection(conn);
        });

        this.peer.on('error', (error) => {
            console.error('Peer error:', error);
        });
    }

    async connectToPeer(remotePeerId) {
        if (this.connections.has(remotePeerId)) {
            console.log('Already connected to peer');
            return;
        }

        const conn = this.peer.connect(remotePeerId, {
            reliable: true
        });

        this.handleConnection(conn);
    }

    handleConnection(conn) {
        conn.on('open', () => {
            this.connections.set(conn.peer, conn);
            this.updateConnectedPeers();
            
            // Send current state to new peer
            this.broadcastToPeer(conn.peer, {
                type: 'FULL_SYNC_REQUEST'
            });
        });

        conn.on('data', (data) => {
            this.handleIncomingData(conn.peer, data);
        });

        conn.on('close', () => {
            this.connections.delete(conn.peer);
            this.updateConnectedPeers();
        });
    }

    handleIncomingData(peerId, data) {
        if (this.onDataReceived) {
            this.onDataReceived(peerId, data);
        }
    }

    broadcast(data) {
        this.connections.forEach((conn) => {
            if (conn.open) {
                conn.send(data);
            }
        });
    }

    broadcastToPeer(peerId, data) {
        const conn = this.connections.get(peerId);
        if (conn && conn.open) {
            conn.send(data);
        }
    }

    updateConnectedPeers() {
        const peersDiv = document.getElementById('connected-peers');
        peersDiv.innerHTML = 'Connected Peers: ' + 
            Array.from(this.connections.keys()).join(', ');
    }
} 