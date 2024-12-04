/**
 * ExpenseCalculator - A library for handling expense-sharing calculations
 */
class ExpenseCalculator {
    /**
     * Calculate balances for all members in a group
     * @param {Array} expenses - Array of expense objects
     * @param {Set|Array} groupMembers - Set or Array of user IDs in the group
     * @returns {Object} Balance sheet with amounts owed/owed to each person
     */
    static calculateGroupBalances(expenses, groupMembers) {
        const balances = {};
        // Convert groupMembers to Array if it's a Set
        const members = Array.from(groupMembers);
        const memberCount = members.length;

        if (memberCount === 0) {
            console.warn('No group members found');
            return {};
        }

        // Initialize balances for all members
        members.forEach(memberId => {
            balances[memberId] = 0;
        });

        // Calculate net balance for each expense
        expenses.forEach(expense => {
            const sharePerPerson = expense.amount / memberCount;
            
            // Add full amount to payer's balance
            balances[expense.paidBy] = (balances[expense.paidBy] || 0) + expense.amount;
            
            // Subtract each person's share
            members.forEach(memberId => {
                balances[memberId] = (balances[memberId] || 0) - sharePerPerson;
            });
        });

        return balances;
    }

    /**
     * Calculate the simplified debts (minimum number of transactions needed)
     * @param {Object} balances - Balance sheet from calculateGroupBalances
     * @returns {Array} Array of transfer objects {from, to, amount}
     */
    static calculateSimplifiedDebts(balances) {
        const transfers = [];
        const epsilon = 0.01; // Handle floating point precision

        // Separate positive and negative balances
        const positiveBalances = [];
        const negativeBalances = [];

        for (const [userId, balance] of Object.entries(balances)) {
            if (balance > epsilon) {
                positiveBalances.push({ userId, balance });
            } else if (balance < -epsilon) {
                negativeBalances.push({ userId, balance });
            }
        }

        // Sort both arrays by absolute amount (descending)
        positiveBalances.sort((a, b) => b.balance - a.balance);
        negativeBalances.sort((a, b) => a.balance - b.balance);

        // Match debts and credits
        while (positiveBalances.length > 0 && negativeBalances.length > 0) {
            const creditor = positiveBalances[0];
            const debtor = negativeBalances[0];

            const transferAmount = Math.min(
                creditor.balance,
                Math.abs(debtor.balance)
            );

            if (transferAmount > epsilon) {
                transfers.push({
                    from: debtor.userId,
                    to: creditor.userId,
                    amount: this.roundToTwo(transferAmount)
                });
            }

            // Update balances
            creditor.balance -= transferAmount;
            debtor.balance += transferAmount;

            // Remove settled balances
            if (Math.abs(creditor.balance) < epsilon) {
                positiveBalances.shift();
            }
            if (Math.abs(debtor.balance) < epsilon) {
                negativeBalances.shift();
            }
        }

        return transfers;
    }

    /**
     * Calculate category-wise spending for a group
     * @param {Array} expenses - Array of expense objects
     * @returns {Object} Category-wise total amounts
     */
    static calculateCategoryTotals(expenses) {
        return expenses.reduce((totals, expense) => {
            const category = expense.category || 'Other';
            totals[category] = (totals[category] || 0) + expense.amount;
            return totals;
        }, {});
    }

    /**
     * Calculate individual member spending statistics
     * @param {Array} expenses - Array of expense objects
     * @param {Set} groupMembers - Set of user IDs in the group
     * @returns {Object} Member-wise spending statistics
     */
    static calculateMemberStats(expenses, groupMembers) {
        const stats = {};
        const memberCount = groupMembers.size;

        for (const memberId of groupMembers) {
            stats[memberId] = {
                totalPaid: 0,
                totalShare: 0,
                expenseCount: 0,
                categoryBreakdown: {}
            };
        }

        expenses.forEach(expense => {
            const sharePerPerson = expense.amount / memberCount;
            
            // Update payer's stats
            stats[expense.paidBy].totalPaid += expense.amount;
            stats[expense.paidBy].expenseCount += 1;
            
            // Update category breakdown for payer
            const category = expense.category || 'Other';
            stats[expense.paidBy].categoryBreakdown[category] = 
                (stats[expense.paidBy].categoryBreakdown[category] || 0) + expense.amount;

            // Update everyone's share
            for (const memberId of groupMembers) {
                stats[memberId].totalShare += sharePerPerson;
            }
        });

        return stats;
    }

    /**
     * Round a number to two decimal places
     * @param {number} num - Number to round
     * @returns {number} Rounded number
     */
    static roundToTwo(num) {
        return Math.round((num + Number.EPSILON) * 100) / 100;
    }

    /**
     * Calculate expense statistics for a date range
     * @param {Array} expenses - Array of expense objects
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Object} Statistics for the date range
     */
    static calculateDateRangeStats(expenses, startDate, endDate) {
        const filteredExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.timestamp.time);
            return expenseDate >= startDate && expenseDate <= endDate;
        });

        return {
            totalAmount: this.roundToTwo(
                filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)
            ),
            expenseCount: filteredExpenses.length,
            averageAmount: this.roundToTwo(
                filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0) / 
                (filteredExpenses.length || 1)
            ),
            categoryBreakdown: this.calculateCategoryTotals(filteredExpenses)
        };
    }
} 