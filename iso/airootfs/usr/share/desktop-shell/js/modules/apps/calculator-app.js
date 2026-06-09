/* ==========================================================================
   FELBIC OS — CALCULATOR APPLICATION MODULE
   ========================================================================== */

export function initCalculatorApp() {
    console.log('[calculator-app] Initializing Calculator App...');

    const win = document.getElementById('calculator-window');
    if (!win) return;

    const display = document.getElementById('calc-display');
    const exprDisplay = document.getElementById('calc-history-expr');
    const grid = win.querySelector('.calculator-grid');
    const sciPanel = document.getElementById('calc-sci-panel');
    const modeToggle = document.getElementById('calc-mode-toggle');
    const historyToggle = document.getElementById('calc-history-toggle');
    const historySidebar = document.getElementById('calc-history-sidebar');
    const historyList = document.getElementById('calc-history-list');
    const clearHistoryBtn = document.getElementById('calc-clear-history');

    // Calculator State
    let displayValue = '0';
    let firstOperand = null;
    let waitingForSecondOperand = false;
    let operator = null;
    let equationHistory = JSON.parse(localStorage.getItem('aios_calc_history') || '[]');

    // 1. Render History
    function renderHistory() {
        if (!historyList) return;
        historyList.innerHTML = '';

        if (equationHistory.length === 0) {
            historyList.innerHTML = `<div style="font-size: 10px; color: var(--text-muted); text-align: center; margin-top: 20px;">No History</div>`;
            return;
        }

        // Show last 20 calculations
        equationHistory.slice(-20).reverse().forEach(item => {
            const el = document.createElement('div');
            el.className = 'calc-history-item';
            el.innerHTML = `
                <span class="calc-history-item-expr">${item.expr} =</span>
                <span class="calc-history-item-res">${item.result}</span>
            `;
            el.addEventListener('click', () => {
                displayValue = String(item.result);
                updateDisplay();
            });
            historyList.appendChild(el);
        });
    }

    // 2. Save history
    function addHistoryItem(expr, result) {
        equationHistory.push({ expr, result });
        if (equationHistory.length > 50) equationHistory.shift(); // clamp history
        localStorage.setItem('aios_calc_history', JSON.stringify(equationHistory));
        renderHistory();
    }

    // 3. Update main display
    function updateDisplay() {
        if (display) {
            display.textContent = displayValue;
        }
    }

    // 4. Handle number inputs
    function inputDigit(digit) {
        if (waitingForSecondOperand) {
            displayValue = digit;
            waitingForSecondOperand = false;
        } else {
            displayValue = displayValue === '0' ? digit : displayValue + digit;
        }
        updateDisplay();
    }

    // 5. Decimals
    function inputDecimal() {
        if (waitingForSecondOperand) {
            displayValue = '0.';
            waitingForSecondOperand = false;
            updateDisplay();
            return;
        }

        if (!displayValue.includes('.')) {
            displayValue += '.';
            updateDisplay();
        }
    }

    // 6. AC / Clear
    function clearCalculator() {
        displayValue = '0';
        firstOperand = null;
        waitingForSecondOperand = false;
        operator = null;
        if (exprDisplay) exprDisplay.textContent = '';
        
        // Remove operator active state styles
        win.querySelectorAll('.calc-btn.operator').forEach(btn => btn.classList.remove('active-op'));
        updateDisplay();
    }

    // 7. Negate
    function negate() {
        displayValue = String(parseFloat(displayValue) * -1);
        updateDisplay();
    }

    // 8. Percent
    function percent() {
        const current = parseFloat(displayValue);
        displayValue = String(current / 100);
        updateDisplay();
    }

    // 9. Standard calculations
    const performCalculation = {
        '/': (first, second) => first / second,
        '*': (first, second) => first * second,
        '-': (first, second) => first - second,
        '+': (first, second) => first + second,
        'pow': (first, second) => Math.pow(first, second)
    };

    function handleOperator(nextOperator) {
        const inputValue = parseFloat(displayValue);

        // UI highlight active operator
        win.querySelectorAll('.calc-btn.operator').forEach(btn => {
            btn.classList.remove('active-op');
            if (btn.getAttribute('data-val') === nextOperator) {
                btn.classList.add('active-op');
            }
        });

        if (operator && waitingForSecondOperand)  {
            operator = nextOperator;
            return;
        }

        if (firstOperand === null && !isNaN(inputValue)) {
            firstOperand = inputValue;
        } else if (operator) {
            const result = performCalculation[operator](firstOperand, inputValue);
            
            if (exprDisplay) {
                exprDisplay.textContent = `${firstOperand} ${operator === 'pow' ? '^' : operator} ${inputValue}`;
            }

            displayValue = String(Number(result.toFixed(10)));
            firstOperand = result;
        }

        waitingForSecondOperand = true;
        operator = nextOperator;
        updateDisplay();
    }

    // 10. Equal trigger
    function calculateFinal() {
        if (operator === null) return;

        const inputValue = parseFloat(displayValue);
        const result = performCalculation[operator](firstOperand, inputValue);
        
        const mathExpr = `${firstOperand} ${operator === 'pow' ? '^' : operator} ${inputValue}`;
        const finalResult = Number(result.toFixed(10));

        if (exprDisplay) exprDisplay.textContent = `${mathExpr} =`;
        addHistoryItem(mathExpr, finalResult);

        displayValue = String(finalResult);
        firstOperand = null;
        operator = null;
        waitingForSecondOperand = false;
        
        win.querySelectorAll('.calc-btn.operator').forEach(btn => btn.classList.remove('active-op'));
        updateDisplay();
    }

    // 11. Scientific Operations
    function executeSciOperation(action) {
        const current = parseFloat(displayValue);
        let result = 0;
        let exprText = '';

        switch(action) {
            case 'sin':
                result = Math.sin(current);
                exprText = `sin(${current})`;
                break;
            case 'cos':
                result = Math.cos(current);
                exprText = `cos(${current})`;
                break;
            case 'tan':
                result = Math.tan(current);
                exprText = `tan(${current})`;
                break;
            case 'sqrt':
                result = Math.sqrt(current);
                exprText = `√(${current})`;
                break;
            case 'square':
                result = current * current;
                exprText = `sqr(${current})`;
                break;
            case 'log':
                result = Math.log10(current);
                exprText = `log(${current})`;
                break;
            case 'ln':
                result = Math.log(current);
                exprText = `ln(${current})`;
                break;
            case 'pi':
                result = Math.PI;
                exprText = 'π';
                break;
            case 'e':
                result = Math.E;
                exprText = 'e';
                break;
            case 'power':
                handleOperator('pow');
                return;
            default:
                return;
        }

        const finalResult = Number(result.toFixed(10));
        if (exprDisplay) exprDisplay.textContent = `${exprText} =`;
        addHistoryItem(exprText, finalResult);

        displayValue = String(finalResult);
        waitingForSecondOperand = true;
        updateDisplay();
    }

    // 12. Grid clicks router
    if (grid) {
        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const val = btn.getAttribute('data-val');
            const action = btn.getAttribute('data-action');

            if (val && !action) {
                if (val === '.') inputDecimal();
                else inputDigit(val);
            } else if (action === 'clear') {
                clearCalculator();
            } else if (action === 'negate') {
                negate();
            } else if (action === 'percent') {
                percent();
            } else if (action === 'operator') {
                handleOperator(val);
            } else if (action === 'calculate') {
                calculateFinal();
            }
        });
    }

    // 13. Scientific grid clicks router
    if (sciPanel) {
        sciPanel.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            if (action) executeSciOperation(action);
        });
    }

    // 14. Sidebar toggles
    if (modeToggle) {
        modeToggle.addEventListener('click', () => {
            win.classList.toggle('scientific-mode');
            if (win.classList.contains('scientific-mode')) {
                sciPanel.style.display = 'grid';
                modeToggle.textContent = 'Standard';
            } else {
                sciPanel.style.display = 'none';
                modeToggle.textContent = 'Scientific';
            }
        });
    }

    if (historyToggle) {
        historyToggle.addEventListener('click', () => {
            historySidebar.classList.toggle('active');
            renderHistory();
        });
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            equationHistory = [];
            localStorage.removeItem('aios_calc_history');
            renderHistory();
        });
    }

    // 15. Global Keyboard Shortcuts handler
    window.addEventListener('keydown', (e) => {
        if (!win.classList.contains('active-focus') || win.style.display === 'none') return;

        // Prevent browser key events default behaviors
        if (e.key === 'Backspace' || e.key === 'Enter' || e.key === 'Escape' || e.key === '/' || e.key === '*') {
            e.preventDefault();
        }

        if (e.key >= '0' && e.key <= '9') {
            inputDigit(e.key);
        } else if (e.key === '.') {
            inputDecimal();
        } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
            handleOperator(e.key);
        } else if (e.key === 'Enter' || e.key === '=') {
            calculateFinal();
        } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
            clearCalculator();
        } else if (e.key === 'Backspace') {
            if (displayValue.length > 1) {
                displayValue = displayValue.slice(0, -1);
                if (displayValue === '-') displayValue = '0';
            } else {
                displayValue = '0';
            }
            updateDisplay();
        }
    });

    // Render initial history list
    renderHistory();
}
