export type DiffSource = {
	getRawDiff(): Promise<string>;
};

export type TwoFileDiffOptions = {
	filePath: string;
	oldContent: string;
	newContent: string;
};
