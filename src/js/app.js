class ExpenseApp {
    constructor() {
        this.crdt = new ExpenseCRDT();
        this.crdt.loadFromLocal();
        
        this.peerManager = new PeerManager((peerId, data) => {
            this.handlePeerData(peerId, data);
        });

        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeUI();
                this.checkUserProfile();
                this.updateCategorySelector();
                // Render existing expenses if we have a current group
                if (this.crdt.currentGroup) {
                    this.renderExpenses();
                }
            });
        } else {
            this.initializeUI();
            this.checkUserProfile();
            this.updateCategorySelector();
            // Render existing expenses if we have a current group
            if (this.crdt.currentGroup) {
                this.renderExpenses();
            }
        }

        // Check for invite in URL
        this.checkForInvite();

        // Initialize install prompt
        this.deferredPrompt = null;
        
        // Listen for beforeinstallprompt
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later
            this.deferredPrompt = e;
            // Show the install button
            this.showInstallButton();
        });
    }

    initializeUI() {
        // Profile setup
        document.getElementById('profile-setup').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProfileSetup();
        });

        // Group management
        document.getElementById('group-setup').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleGroupCreation();
        });

        document.getElementById('new-group-btn').addEventListener('click', () => {
            document.getElementById('group-form').classList.remove('hidden');
        });

        document.getElementById('group-selector').addEventListener('change', (e) => {
            this.handleGroupSelection(e.target.value);
        });

        // Expense form
        document.getElementById('new-expense').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleNewExpense();
        });

        // Initialize category selector
        this.updateCategorySelector();
    }

    checkUserProfile() {
        if (!this.crdt.currentUser) {
            document.getElementById('profile-form').classList.remove('hidden');
            document.getElementById('group-section').classList.add('hidden');
            document.getElementById('expense-form').classList.add('hidden');
            document.getElementById('balance-section').classList.add('hidden');
        } else {
            this.showUserProfile();
            document.getElementById('profile-form').classList.add('hidden');
            document.getElementById('group-section').classList.remove('hidden');
            
            if (this.crdt.currentGroup) {
                document.getElementById('expense-form').classList.remove('hidden');
                document.getElementById('balance-section').classList.remove('hidden');
                this.renderExpenses(); // Render expenses when showing group
            } else {
                document.getElementById('expense-form').classList.add('hidden');
                document.getElementById('balance-section').classList.add('hidden');
            }
            
            this.updateGroupUI();
        }
    }

    handleProfileSetup() {
        const name = document.getElementById('user-name').value;
        const email = document.getElementById('user-email').value;
        
        const profile = new UserProfile(
            `user-${new Timestamp().time}`,
            name,
            email
        );

        this.crdt.setCurrentUser(profile);
        this.showUserProfile();
        
        document.getElementById('profile-form').classList.add('hidden');
        document.getElementById('group-section').classList.remove('hidden');
        
        this.updateGroupUI();

        // Check for pending invite
        if (this.pendingInvite) {
            this.handleInvite(this.pendingInvite);
            this.pendingInvite = null;
        }
    }

    showUserProfile() {
        const user = this.crdt.currentUser;
        document.getElementById('current-user').innerHTML = `
            <div class="user-info">
                <h3>${user.name}</h3>
                <p>${user.email}</p>
            </div>
        `;
    }

    handleGroupCreation() {
        const name = document.getElementById('group-name').value;
        const group = this.crdt.createGroup(name);
        
        document.getElementById('group-form').classList.add('hidden');
        document.getElementById('group-name').value = '';
        
        document.getElementById('expense-form').classList.remove('hidden');
        document.getElementById('balance-section').classList.remove('hidden');
        
        this.updateGroupUI();
        this.renderExpenses();
    }

    handleGroupSelection(groupId) {
        if (groupId) {
            const group = this.crdt.groups.get(groupId);
            this.crdt.currentGroup = group;
            this.crdt.saveToLocal();
            
            // Show expense form and balance section when group is selected
            document.getElementById('expense-form').classList.remove('hidden');
            document.getElementById('balance-section').classList.remove('hidden');
            
            // Update category selector when showing expense form
            this.updateCategorySelector();
        } else {
            this.crdt.currentGroup = null;
            
            // Hide expense form and balance section when no group is selected
            document.getElementById('expense-form').classList.add('hidden');
            document.getElementById('balance-section').classList.add('hidden');
        }
        
        this.renderExpenses();
    }

    updateGroupUI() {
        const selector = document.getElementById('group-selector');
        selector.innerHTML = '<option value="">Select Group</option>';
        
        this.crdt.groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            if (this.crdt.currentGroup && this.crdt.currentGroup.id === group.id) {
                option.selected = true;
            }
            selector.appendChild(option);
        });

        if (this.crdt.currentGroup) {
            document.getElementById('current-group').innerHTML = `
                <h3>Current Group: ${this.crdt.currentGroup.name}</h3>
            `;
            this.renderExpenses(); // Render expenses when updating group UI
        }

        // Add invite button for current group
        if (this.crdt.currentGroup) {
            const inviteBtn = document.createElement('button');
            inviteBtn.textContent = 'Invite Friends';
            inviteBtn.onclick = () => this.showInviteDialog();
            document.getElementById('current-group').appendChild(inviteBtn);
            // vertical margin bottom
            inviteBtn.style.marginBottom = '10px';
        }
    }

    updateCategorySelector() {
        console.log('Starting updateCategorySelector');
        
        // Check if CRDT is initialized
        console.log('CRDT instance:', this.crdt);
        console.log('CRDT categories:', this.crdt?.categories);
        
        const selector = document.getElementById('category');
        console.log('Found selector:', selector);
        
        if (!selector) {
            console.error('Category selector not found in DOM');
            return;
        }

        if (!this.crdt?.categories) {
            console.error('Categories not initialized in CRDT');
            return;
        }

        // Clear existing options
        selector.innerHTML = '<option value="">Select Category</option>';
        
        // Convert Set to Array and sort
        const sortedCategories = Array.from(this.crdt.categories).sort();
        console.log('Sorted categories:', sortedCategories);
        
        sortedCategories.forEach(category => {
            console.log('Adding category:', category);
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            selector.appendChild(option);
        });

        console.log('Final options count:', selector.options.length);
        console.log('Final selector HTML:', selector.innerHTML);
    }

    handleNewExpense() {
        const description = document.getElementById('description').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;

        if (description && amount && category) {
            const expense = this.crdt.addExpense({ description, amount, category });
            this.renderExpenses();
            this.peerManager.broadcast(this.crdt.generateSyncMessage());
            document.getElementById('new-expense').reset();
        }
    }

    renderExpenses() {
        console.log('Rendering expenses...');
        const expenseList = document.getElementById('expense-list');
        
        if (!this.crdt.currentGroup) {
            console.log('No current group selected');
            expenseList.innerHTML = '<p>Please select a group</p>';
            return;
        }

        const expenses = this.crdt.getGroupExpenses(this.crdt.currentGroup.id);
        console.log('Found expenses:', expenses);

        expenseList.innerHTML = expenses.map(expense => `
            <div class="expense-item" data-id="${expense.id}">
                <div class="expense-category">${expense.category}</div>
                <div class="expense-description">${expense.description}</div>
                <div class="expense-amount">$${expense.amount.toFixed(2)}</div>
                <div class="expense-paid-by">Paid by: ${
                    this.crdt.users.get(expense.paidBy)?.name || 'Unknown'
                }</div>
                <button onclick="app.removeExpense('${expense.id}')">Delete</button>
            </div>
        `).join('');

        this.updateBalances();
    }

    updateBalances() {
        if (!this.crdt.currentGroup) return;

        const expenses = this.crdt.getGroupExpenses(this.crdt.currentGroup.id);
        const members = this.crdt.currentGroup.members;

        // Add console logs for debugging
        console.log('Updating balances:', {
            groupId: this.crdt.currentGroup.id,
            expenses: expenses,
            members: members
        });

        // Calculate balances
        const balances = ExpenseCalculator.calculateGroupBalances(expenses, members);
        const transfers = ExpenseCalculator.calculateSimplifiedDebts(balances);
        const categoryTotals = ExpenseCalculator.calculateCategoryTotals(expenses);
        const memberStats = ExpenseCalculator.calculateMemberStats(expenses, members);

        // Update UI
        const balanceSection = document.getElementById('balance-section');
        balanceSection.classList.remove('hidden');

        // Render balance summary
        const balanceSummary = document.getElementById('balance-summary');
        balanceSummary.innerHTML = Object.entries(balances)
            .map(([userId, balance]) => {
                const user = this.crdt.users.get(userId);
                return `
                    <div class="balance-item ${balance >= 0 ? 'positive' : 'negative'}">
                        <span>${user?.name || 'Unknown'}</span>
                        <span>${balance >= 0 ? 'gets back' : 'owes'} 
                              $${Math.abs(balance).toFixed(2)}</span>
                    </div>
                `;
            })
            .join('');

        // Render simplified transfers
        const transfersDiv = document.getElementById('simplified-transfers');
        transfersDiv.innerHTML = `
            <h3>Suggested Settlements</h3>
            ${transfers.map(transfer => {
                const from = this.crdt.users.get(transfer.from)?.name;
                const to = this.crdt.users.get(transfer.to)?.name;
                return `
                    <div class="transfer-item">
                        ${from} pays ${to} $${transfer.amount.toFixed(2)}
                    </div>
                `;
            }).join('')}
        `;

        // Render category breakdown
        const categoryDiv = document.getElementById('category-breakdown');
        categoryDiv.innerHTML = `
            <h3>Category Breakdown</h3>
            ${Object.entries(categoryTotals)
                .map(([category, amount]) => `
                    <div class="category-item">
                        <span>${category}</span>
                        <span>$${amount.toFixed(2)}</span>
                    </div>
                `)
                .join('')}
        `;
    }

    // Add removeExpense method if it's missing
    removeExpense(id) {
        this.crdt.removeExpense(id);
        this.renderExpenses();
        this.peerManager.broadcast(this.crdt.generateSyncMessage());
    }

    checkForInvite() {
        const urlParams = new URLSearchParams(window.location.search);
        const inviteId = urlParams.get('invite');
        
        if (inviteId) {
            // Remove invite from URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Store invite to handle after user login if needed
            this.pendingInvite = inviteId;
            
            if (this.crdt.currentUser) {
                this.handleInvite(inviteId);
            }
        }
    }

    handleInvite(inviteId) {
        try {
            this.crdt.acceptInvite(inviteId);
            this.showMessage('Successfully joined group!');
            this.updateGroupUI();
            this.renderExpenses();
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }

    showMessage(message, type = 'success') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        setTimeout(() => messageDiv.remove(), 3000);
    }

    showInviteDialog() {
        const inviteLink = this.crdt.generateGroupInviteLink(this.crdt.currentGroup.id);
        
        const dialog = document.createElement('div');
        dialog.className = 'invite-dialog';
        dialog.innerHTML = `
            <h3>Invite Friends</h3>
            <p>Share this link with your friends:</p>
            <div class="invite-link-container">
                <input type="text" readonly value="${inviteLink}">
                <button onclick="navigator.clipboard.writeText('${inviteLink}')">Copy</button>
            </div>
            <div id="qr-code"></div>
            <button onclick="this.parentElement.remove()">Close</button>
        `;
        
        document.body.appendChild(dialog);

        // Generate QR code
        const qrCodeContainer = document.getElementById('qr-code');
        QRCode.toCanvas(qrCodeContainer, inviteLink, { width: 128 }, function (error) {
            if (error) console.error(error);
        });
    }

    showInstallButton() {
        const header = document.querySelector('header');
        const installButton = document.createElement('button');
        installButton.id = 'install-button';
        installButton.className = 'install-button';
        installButton.innerHTML = ' Add to Home Screen';
        installButton.addEventListener('click', () => this.installApp());
        
        // Only show if not already installed
        if (!this.isAppInstalled()) {
            header.appendChild(installButton);
        }
    }

    async installApp() {
        if (!this.deferredPrompt) {
            // If on iOS, show custom instructions
            if (this.isIOS()) {
                this.showIOSInstallInstructions();
                return;
            }
            return;
        }

        // Show the install prompt
        this.deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        
        // Clear the deferredPrompt
        this.deferredPrompt = null;
        
        // Hide the button
        document.getElementById('install-button')?.remove();
    }

    showIOSInstallInstructions() {
        const dialog = document.createElement('div');
        dialog.className = 'install-dialog';
        dialog.innerHTML = `
            <h3>Install billooo on your iPhone</h3>
            <ol>
                <li>Tap the Share button <span class="ios-share-icon">⎙</span></li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Tap "Add" to confirm</li>
            </ol>
            <button onclick="this.parentElement.remove()">Close</button>
        `;
        document.body.appendChild(dialog);
    }

    isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    isAppInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }
}

// Initialize app
const app = new ExpenseApp();