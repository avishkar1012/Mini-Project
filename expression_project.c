#include <stdio.h>
#include <ctype.h>

#define MAX 100

char stack[MAX];
int top = -1;

int values[MAX];
int vtop = -1;

void push(char c) {
    if (top == MAX - 1)
        printf("Stack overflow\n");
    else
        stack[++top] = c;
}

char pop() {
    if (top == -1)
        return '\0';

    return stack[top--];
}

int precedence(char c) {
    switch (c) {
        case '^': return 3;
        case '*':
        case '/':
        case '%': return 2;
        case '+':
        case '-': return 1;
        default: return 0;
    }
}

int isOperator(char c) {
    return (c == '+' || c == '-' || c == '*' ||
            c == '/' || c == '%' || c == '^');
}

void infixToPostfix(char infix[], char postfix[]) {
    int i, j = 0;
    char c;

    top = -1;

    for (i = 0; infix[i] != '\0'; i++) {
        c = infix[i];

        if (c == ' ')
            continue;

        if (isalnum((unsigned char)c)) {
            postfix[j++] = c;
        }
        else if (c == '(') {
            push(c);
        }
        else if (c == ')') {
            while (top != -1 && stack[top] != '(')
                postfix[j++] = pop();

            if (top != -1)
                pop();
        }
        else if (isOperator(c)) {
            while (top != -1 && stack[top] != '(' &&
                   (precedence(stack[top]) > precedence(c) ||
                   (precedence(stack[top]) == precedence(c)
                    && c != '^'))) {
                postfix[j++] = pop();
            }

            push(c);
        }
    }

    while (top != -1)
        postfix[j++] = pop();

    postfix[j] = '\0';
}

int evaluatePostfix(char postfix[]) {
    int i, a, b;
    char c;

    vtop = -1;

    for (i = 0; postfix[i] != '\0'; i++) {
        c = postfix[i];

        if (isdigit((unsigned char)c)) {
            values[++vtop] = c - '0';
        }
        else if (isOperator(c)) {
            if (vtop < 1) {
                printf("Invalid expression\n");
                return 0;
            }

            b = values[vtop--];
            a = values[vtop--];

            switch (c) {
                case '+': values[++vtop] = a + b; break;
                case '-': values[++vtop] = a - b; break;
                case '*': values[++vtop] = a * b; break;

                case '/':
                    if (b == 0) {
                        printf("Division by zero!\n");
                        return 0;
                    }
                    values[++vtop] = a / b;
                    break;

                case '%':
                    if (b == 0) {
                        printf("Modulo by zero!\n");
                        return 0;
                    }
                    values[++vtop] = a % b;
                    break;

                case '^': {
                    int result = 1, k;

                    if (b < 0) {
                        printf("Negative powers not supported\n");
                        return 0;
                    }

                    for (k = 0; k < b; k++)
                        result *= a;

                    values[++vtop] = result;
                    break;
                }
            }
        }
        else {
            printf("Cannot evaluate variables or letters\n");
            return 0;
        }
    }

    if (vtop != 0) {
        printf("Invalid expression\n");
        return 0;
    }

    return values[vtop];
}

int main() {
    char infix[MAX], postfix[MAX];

    printf("Enter an infix expression: ");
    if (scanf("%99s", infix) != 1)
        return 1;

    infixToPostfix(infix, postfix);

    printf("Postfix expression: %s\n", postfix);

    printf("Result: %d\n", evaluatePostfix(postfix));

    return 0;
}
