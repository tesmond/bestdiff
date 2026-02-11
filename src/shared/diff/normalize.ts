export function normalizeLineEndings(input: string): string {
	return input.replace(/\r\n?/g, "\n");
}
