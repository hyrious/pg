/** main function */
export async function main() {
    const { default: hello } = await import("./hello");
    hello("Kaf");
    setTimeout(() => {
        throw new Error("err...");
    }, 3000);
}

main().catch(console.error);
