class Timestamp {
    constructor() {
        this.time = Date.now();
        this.counter = 0;
        this.nodeId = this.generateNodeId();
    }

    generateNodeId() {
        // Generate a random node ID if not stored
        let nodeId = localStorage.getItem('nodeId');
        if (!nodeId) {
            nodeId = Math.random().toString(36).substr(2, 9);
            localStorage.setItem('nodeId', nodeId);
        }
        return nodeId;
    }

    isAfter(other) {
        if (this.time !== other.time) {
            return this.time > other.time;
        }
        if (this.counter !== other.counter) {
            return this.counter > other.counter;
        }
        return this.nodeId > other.nodeId;
    }
}

class UserProfile {
    constructor(id, name, email) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.timestamp = new Timestamp();
    }
}

class Group {
    constructor(id, name, createdBy) {
        this.id = id;
        this.name = name;
        this.createdBy = createdBy;
        this.members = new Set([createdBy]);
        this.timestamp = new Timestamp();
    }
}

class ExpenseCRDT {
    constructor() {
        this.expenses = new Map(); // id -> expense
        this.tombstones = new Set(); // deleted expense ids
        
        this.users = new Map(); // userId -> UserProfile
        this.groups = new Map(); // groupId -> Group
        this.defaultCategories = [
            'Food',
            'Transport',
            'Rent',
            'Utilities',
            'Entertainment',
            'Shopping',
            'Travel',
            'Healthcare',
            'Education',
            'Other'
        ];
        this.categories = new Set(this.defaultCategories);
        this.currentUser = null;
        this.currentGroup = null;
        this.pendingInvites = new Map(); // inviteId -> {groupId, expiresAt}
    }

    setCurrentUser(profile) {
        this.currentUser = profile;
        this.users.set(profile.id, profile);
        this.saveToLocal();
    }

    createGroup(name) {
        if (!this.currentUser) throw new Error('No user logged in');
        
        const groupId = `group-${new Timestamp().time}-${this.currentUser.id}`;
        const group = {
            id: groupId,
            name: name,
            createdBy: this.currentUser.id,
            members: new Set([this.currentUser.id]),
            timestamp: new Timestamp()
        };
        
        this.groups.set(groupId, group);
        this.currentGroup = group;
        this.saveToLocal();
        return group;
    }

    addExpense(expense) {
        if (!this.currentUser) throw new Error('No user logged in');
        if (!this.currentGroup) throw new Error('No group selected');

        const timestamp = new Timestamp();
        const id = `expense-${timestamp.time}-${this.currentUser.id}`;
        
        const expenseData = {
            id,
            description: expense.description,
            amount: expense.amount,
            category: expense.category || 'Other',
            groupId: this.currentGroup.id,
            paidBy: this.currentUser.id,
            timestamp,
            createdBy: this.currentUser.id
        };

        this.expenses.set(id, expenseData);
        this.saveToLocal();
        return expenseData;
    }

    removeExpense(id) {
        this.tombstones.add(id);
        this.saveToLocal();
    }

    addCategory(category) {
        this.categories.add(category);
        this.saveToLocal();
    }

    merge(other) {
        // Merge expenses
        other.expenses.forEach((expense, id) => {
            const existing = this.expenses.get(id);
            if (!existing || expense.timestamp.isAfter(existing.timestamp)) {
                this.expenses.set(id, expense);
            }
        });

        // Merge users
        other.users.forEach((user, id) => {
            const existing = this.users.get(id);
            if (!existing || user.timestamp.isAfter(existing.timestamp)) {
                this.users.set(id, user);
            }
        });

        // Merge groups
        other.groups.forEach((group, id) => {
            const existing = this.groups.get(id);
            if (!existing || group.timestamp.isAfter(existing.timestamp)) {
                this.groups.set(id, group);
            }
        });

        // Merge categories
        other.categories.forEach(category => {
            this.categories.add(category);
        });

        // Merge tombstones
        other.tombstones.forEach(id => {
            this.tombstones.add(id);
        });

        this.saveToLocal();
    }

    getActiveExpenses() {
        return Array.from(this.expenses.values())
            .filter(expense => !this.tombstones.has(expense.id))
            .sort((a, b) => b.timestamp.time - a.timestamp.time);
    }

    saveToLocal() {
        const data = {
            expenses: Array.from(this.expenses.entries()),
            tombstones: Array.from(this.tombstones),
            users: Array.from(this.users.entries()),
            groups: Array.from(this.groups.entries()),
            categories: Array.from(this.categories),
            currentUser: this.currentUser,
            currentGroup: this.currentGroup
        };
        localStorage.setItem('expenseCRDT', JSON.stringify(data));
    }

    loadFromLocal() {
        const data = localStorage.getItem('expenseCRDT');
        if (data) {
            const parsed = JSON.parse(data);
            
            // Load basic data structures
            this.expenses = new Map(parsed.expenses);
            this.tombstones = new Set(parsed.tombstones);
            this.users = new Map(parsed.users);
            
            // Handle groups with Set conversion for members
            this.groups = new Map();
            parsed.groups.forEach(([id, group]) => {
                group.members = new Set(Array.isArray(group.members) ? group.members : [group.createdBy]);
                this.groups.set(id, group);
            });
            
            // Handle categories
            this.categories = new Set(
                parsed.categories && parsed.categories.length > 0 
                    ? parsed.categories 
                    : this.defaultCategories
            );
            
            // Handle current user and group
            this.currentUser = parsed.currentUser;
            if (parsed.currentGroup) {
                const currentGroup = this.groups.get(parsed.currentGroup.id);
                if (currentGroup) {
                    this.currentGroup = currentGroup;
                }
            }
        }
        
        // Ensure categories are never empty
        if (this.categories.size === 0) {
            this.categories = new Set(this.defaultCategories);
            this.saveToLocal();
        }

        console.log('Loaded data:', {
            expenses: this.expenses.size,
            users: this.users.size,
            groups: this.groups.size,
            currentGroup: this.currentGroup ? {
                id: this.currentGroup.id,
                members: Array.from(this.currentGroup.members)
            } : null
        });
    }

    generateSyncMessage() {
        return {
            type: 'SYNC',
            expenses: Array.from(this.expenses.entries()),
            tombstones: Array.from(this.tombstones),
            users: Array.from(this.users.entries()),
            groups: Array.from(this.groups.entries()),
            categories: Array.from(this.categories)
        };
    }

    handleSyncMessage(message) {
        if (message.type === 'SYNC') {
            const otherCRDT = new ExpenseCRDT();
            otherCRDT.expenses = new Map(message.expenses);
            otherCRDT.tombstones = new Set(message.tombstones);
            otherCRDT.users = new Map(message.users);
            otherCRDT.groups = new Map(message.groups);
            otherCRDT.categories = new Set(message.categories);
            this.merge(otherCRDT);
            return true;
        }
        return false;
    }

    getGroupExpenses(groupId) {
        return Array.from(this.expenses.values())
            .filter(expense => 
                expense.groupId === groupId && 
                !this.tombstones.has(expense.id)
            )
            .sort((a, b) => b.timestamp.time - a.timestamp.time);
    }

    generateGroupInviteLink(groupId) {
        if (!this.currentUser || !this.groups.has(groupId)) {
            throw new Error('Invalid group or user');
        }

        const inviteId = `inv-${new Timestamp().time}-${this.currentUser.id}`;
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

        this.pendingInvites.set(inviteId, {
            groupId,
            expiresAt
        });

        this.saveToLocal();

        // Generate invite URL
        const baseUrl = window.location.origin;
        return `${baseUrl}?invite=${inviteId}`;
    }

    acceptInvite(inviteId) {
        const invite = this.pendingInvites.get(inviteId);
        if (!invite || !this.currentUser) {
            throw new Error('Invalid invite or user not logged in');
        }

        if (invite.expiresAt < Date.now()) {
            this.pendingInvites.delete(inviteId);
            throw new Error('Invite has expired');
        }

        const group = this.groups.get(invite.groupId);
        if (!group) {
            throw new Error('Group not found');
        }

        // Add user to group
        group.members.add(this.currentUser.id);
        this.currentGroup = group;
        this.pendingInvites.delete(inviteId);
        this.saveToLocal();
    }
}