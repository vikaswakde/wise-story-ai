export interface StoryStructure {
  introduction: string;
  chapters: {
    title: string;
    content: string;
    mood: string;
  }[];
  conclusion: string;
}

export interface SceneDescription {
  chapter: number;
  setting: string;
  characters: string[];
  action: string;
  mood: string;
  visualDetails: string;
}

export interface StoryContent {
  structure: StoryStructure | null;
  scenes: SceneDescription[];
  imagePrompts: string[];
}

export type StoryStatus =
  | "draft" // Initial state
  | "processing_content" // Generating story content
  | "processing_assets" // Generating images/audio
  | "generated_content" // Content generated, no assets
  | "generated" // Everything generated
  | "error"; // Error in any step
