class CalculatorModel {
    constructor() {
        this.currentExpression = '';
        this.memory = 0;
        this.lastResult = null;
        this.isNewInput = false;
    }

    appendToExpression(value) {
        if (this.isNewInput) {
            this.currentExpression = '';
            this.isNewInput = false;
        }
        this.currentExpression += value;
    }

    clear() {
        this.currentExpression = '';
        this.isNewInput = false;
    }

    allClear() {
        this.clear();
        this.memory = 0;
        this.lastResult = null;
    }

    evaluate() {
        try {
            const tokens = this.tokenize(this.currentExpression);
            const postfix = this.infixToPostfix(tokens);
            const result = this.evaluatePostfix(postfix);
            this.lastResult = result;
            this.isNewInput = true;
            return result;
        } catch (error) {
            this.lastResult = null;
            this.isNewInput = true;
            return 'Error';
        }
    }

    tokenize(expression) {
        const regex = /(-?\d+\.?\d*|\.\d+)|([+\-*/%^])|(sqrt|sin|cos|tan|log)|([()])|(\S)/g;
        const tokens = [];
        let match;

        while ((match = regex.exec(expression)) !== null) {
            if (match[1]) {
                tokens.push({ type: 'number', value: parseFloat(match[1]) });
            } else if (match[2]) {
                tokens.push({ type: 'operator', value: match[2] });
            } else if (match[3]) {
                tokens.push({ type: 'function', value: match[3] });
            } else if (match[4]) {
                tokens.push({ type: 'paren', value: match[4] });
            } else if (match[5]) {
                throw new Error(`Invalid token: ${match[5]}`);
            }
        }

        return tokens;
    }

    infixToPostfix(tokens) {
        const output = [];
        const stack = [];
        const precedence = {
            '+': 1, '-': 1,
            '*': 2, '/': 2, '%': 2,
            '^': 3,
            'sqrt': 4, 'sin': 4, 'cos': 4, 'tan': 4, 'log': 4
        };

        for (const token of tokens) {
            if (token.type === 'number') {
                output.push(token);
            } else if (token.type === 'function') {
                stack.push(token);
            } else if (token.type === 'paren') {
                if (token.value === '(') {
                    stack.push(token);
                } else {
                    while (stack.length > 0 && stack[stack.length - 1].value !== '(') {
                        output.push(stack.pop());
                    }
                    stack.pop();
                    if (stack.length > 0 && stack[stack.length - 1].type === 'function') {
                        output.push(stack.pop());
                    }
                }
            } else if (token.type === 'operator') {
                while (stack.length > 0 && stack[stack.length - 1].value !== '(' &&
                    precedence[token.value] <= precedence[stack[stack.length - 1].value]) {
                    output.push(stack.pop());
                }
                stack.push(token);
            }
        }

        while (stack.length > 0) {
            output.push(stack.pop());
        }

        return output;
    }

    evaluatePostfix(postfix) {
        const stack = [];
        for (const token of postfix) {
            if (token.type === 'number') {
                stack.push(token.value);
            } else if (token.type === 'operator') {
                const b = stack.pop();
                const a = stack.pop() || 0;
                switch (token.value) {
                    case '+': stack.push(a + b); break;
                    case '-': stack.push(a - b); break;
                    case '*': stack.push(a * b); break;
                    case '/':
                        if (b === 0) throw new Error('Division by zero');
                        stack.push(a / b);
                        break;
                    case '%': stack.push(a % b); break;
                    case '^': stack.push(Math.pow(a, b)); break;
                    default: throw new Error('Unknown operator');
                }
            } else if (token.type === 'function') {
                const a = stack.pop();
                switch (token.value) {
                    case 'sqrt':
                        if (a < 0) throw new Error('Square root of negative number');
                        stack.push(Math.sqrt(a));
                        break;
                    case 'sin': stack.push(Math.sin(a)); break;
                    case 'cos': stack.push(Math.cos(a)); break;
                    case 'tan': stack.push(Math.tan(a)); break;
                    case 'log':
                        if (a <= 0) throw new Error('Logarithm of non-positive number');
                        stack.push(Math.log10(a));
                        break;
                    default: throw new Error('Unknown function');
                }
            }
        }
        if (stack.length !== 1) throw new Error('Invalid expression');
        return stack[0];
    }

    memoryAdd() {
        if (this.lastResult !== null) {
            this.memory += this.lastResult;
        }
    }

    memorySubtract() {
        if (this.lastResult !== null) {
            this.memory -= this.lastResult;
        }
    }

    memoryRecall() {
        return this.memory;
    }

    memoryClear() {
        this.memory = 0;
    }
}

class CalculatorController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => this.handleButtonClick(button));
        });
    }

    handleButtonClick(button) {
        const action = button.getAttribute('data-action');
        const type = button.getAttribute('data-type');
        const value = button.getAttribute('data-value');

        if (action) {
            this.handleMemoryAction(action);
        } else if (type === 'equals') {
            this.handleEquals();
        } else if (type === 'clear') {
            this.model.clear();
        } else if (type === 'all-clear') {
            this.model.allClear();
        } else {
            this.handleInput(value, type);
        }

        this.updateView();
    }

    handleMemoryAction(action) {
        switch (action) {
            case 'mc':
                this.model.memoryClear();
                break;
            case 'mr':
                this.model.appendToExpression(this.model.memoryRecall().toString());
                break;
            case 'm+':
                this.model.memoryAdd();
                break;
            case 'm-':
                this.model.memorySubtract();
                break;
        }
    }

    handleEquals() {
        const result = this.model.evaluate();
        this.view.updateResult(result);
    }

    handleInput(value, type) {
        if (this.model.lastResult !== null) {
            if (type === 'number' || type === 'decimal') {
                this.model.clear();
            } else if (type === 'operator' || type === 'function' || type === 'paren') {
                this.model.currentExpression = this.model.lastResult.toString();
                this.model.lastResult = null;
            }
        }
        this.model.appendToExpression(value);
    }

    updateView() {
        this.view.updateExpression(this.model.currentExpression);
        if (this.model.lastResult !== null) {
            this.view.updateResult(this.model.lastResult);
        } else if (this.model.currentExpression === '') {
            this.view.updateResult(0);
        }
    }
}

class CalculatorView {
    constructor() {
        this.expressionElement = document.querySelector('.expression');
        this.resultElement = document.querySelector('.result');
    }

    updateExpression(expression) {
        this.expressionElement.textContent = expression;
    }

    updateResult(result) {
        this.resultElement.textContent = result;
        this.resultElement.classList.toggle('error', result === 'Error');
    }
}

// Initialize the application
const model = new CalculatorModel();
const view = new CalculatorView();
const controller = new CalculatorController(model, view);
