export declare const MAX_PROFILE_PHOTO_BYTES: number;
export declare function getInitials(name?: string | null): string;
export declare function profilePhotoFileError(file: { name: string; type: string; size: number }): string | null;
export declare function profilePhotoUrl(reference?: string | null): string | null;
