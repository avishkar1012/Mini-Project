
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <limits.h>
#include <errno.h>

#define MAX 400

long long stack[MAX];
int top = -1;

int push(long long value)
{
    if (top >= MAX - 1)
        return 0;

    stack[++top] = value;
    return 1;
}

int pop(long long *value)
{
    if (top == -1)
        return 0;

    *value = stack[top--];
    return 1;
}

int isOperator(const char *token)
{
    return strlen(token) == 1 &&
           strchr("+-*/", token[0]) != NULL;
}

int main(void)
{
    char expression[MAX];
    char *token;
    char *end;
    long long a, b, result;
    long long number;

    printf("Enter postfix expression (space-separated): ");

    if (fgets(expression, sizeof(expression), stdin) == NULL)
        return 1;

    token = strtok(expression, " \t\r\n");

    while (token != NULL)
    {
        if (isOperator(token))
        {
            if (top < 1)
            {
                printf("Error: insufficient operands.\n");
                return 1;
            }

            pop(&b);  // Right operand
            pop(&a);  // Left operand

            switch (token[0])
            {
                case '+':
                    if (__builtin_add_overflow(a, b, &result))
                    {
                        printf("Error: arithmetic overflow.\n");
                        return 1;
                    }
                    break;

                case '-':
                    if (__builtin_sub_overflow(a, b, &result))
                    {
                        printf("Error: arithmetic overflow.\n");
                        return 1;
                    }
                    break;

                case '*':
                    if (__builtin_mul_overflow(a, b, &result))
                    {
                        printf("Error: arithmetic overflow.\n");
                        return 1;
                    }
                    break;

                case '/':
                    if (b == 0)
                    {
                        printf("Error: division by zero.\n");
                        return 1;
                    }

                    if (a == LLONG_MIN && b == -1)
                    {
                        printf("Error: arithmetic overflow.\n");
                        return 1;
                    }

                    result = a / b;
                    break;
            }

            if (!push(result))
            {
                printf("Error: stack overflow.\n");
                return 1;
            }
        }
        else
        {
            errno = 0;
            number = strtoll(token, &end, 10);

            if (token == end || *end != '\0' ||
                errno == ERANGE)
            {
                printf("Error: invalid token '%s'.\n", token);
                return 1;
            }

            if (!push(number))
            {
                printf("Error: stack overflow.\n");
                return 1;
            }
        }

        token = strtok(NULL, " \t\r\n");
    }

    if (top != 0)
    {
        printf("Error: invalid postfix expression.\n");
        return 1;
    }

    printf("Result = %lld\n", stack[top]);

    return 0;
}
