
#include <stdio.h>
#include <ctype.h>

#define MAX 200
#define OUT 400

char stack[MAX];
int top = -1;

int precedence(char op)
{
    if (op == '+' || op == '-')
        return 1;

    if (op == '*' || op == '/')
        return 2;

    return 0;
}

int isOperator(char ch)
{
    return ch == '+' || ch == '-' ||
           ch == '*' || ch == '/';
}

int push(char ch)
{
    if (top == MAX - 1)
        return 0;

    stack[++top] = ch;
    return 1;
}

char pop(void)
{
    if (top == -1)
        return '\0';

    return stack[top--];
}

char peek(void)
{
    if (top == -1)
        return '\0';

    return stack[top];
}

int main(void)
{
    char infix[MAX];
    char postfix[OUT];
    int i = 0, j = 0;
    int expectOperand = 1;

    top = -1;

    printf("Enter infix expression: ");

    if (fgets(infix, sizeof(infix), stdin) == NULL)
        return 1;

    while (infix[i] != '\0')
    {
        char ch = infix[i];

        if (isspace((unsigned char)ch))
        {
            i++;
            continue;
        }

        /* Read a complete integer */
        if (isdigit((unsigned char)ch))
        {
            if (!expectOperand)
            {
                printf("Error: missing operator.\n");
                return 1;
            }

            while (isdigit((unsigned char)infix[i]))
            {
                if (j + 12 >= OUT)
                {
                    printf("Error: output too long.\n");
                    return 1;
                }

                postfix[j++] = infix[i++];
            }

            postfix[j++] = ' ';
            expectOperand = 0;
            continue;
        }

        if (ch == '(')
        {
            if (!expectOperand)
            {
                printf("Error: missing operator before '('.\n");
                return 1;
            }

            if (!push(ch))
            {
                printf("Error: stack overflow.\n");
                return 1;
            }

            i++;
        }
        else if (ch == ')')
        {
            if (expectOperand)
            {
                printf("Error: missing operand before ')'.\n");
                return 1;
            }

            while (top != -1 && peek() != '(')
            {
                if (j + 2 >= OUT)
                {
                    printf("Error: output too long.\n");
                    return 1;
                }

                postfix[j++] = pop();
                postfix[j++] = ' ';
            }

            if (top == -1)
            {
                printf("Error: mismatched parentheses.\n");
                return 1;
            }

            pop(); /* Discard '(' */
            i++;
        }
        else if (isOperator(ch))
        {
            if (expectOperand)
            {
                printf("Error: operator without left operand.\n");
                return 1;
            }

            while (top != -1 && peek() != '(' &&
                   precedence(peek()) >= precedence(ch))
            {
                if (j + 2 >= OUT)
                {
                    printf("Error: output too long.\n");
                    return 1;
                }

                postfix[j++] = pop();
                postfix[j++] = ' ';
            }

            if (!push(ch))
            {
                printf("Error: stack overflow.\n");
                return 1;
            }

            expectOperand = 1;
            i++;
        }
        else
        {
            printf("Error: invalid character '%c'.\n", ch);
            return 1;
        }
    }

    if (expectOperand)
    {
        printf("Error: incomplete expression.\n");
        return 1;
    }

    while (top != -1)
    {
        if (peek() == '(')
        {
            printf("Error: mismatched parentheses.\n");
            return 1;
        }

        if (j + 2 >= OUT)
        {
            printf("Error: output too long.\n");
            return 1;
        }

        postfix[j++] = pop();
        postfix[j++] = ' ';
    }

    postfix[j] = '\0';

    printf("Postfix expression: %s\n", postfix);

    return 0;
}
