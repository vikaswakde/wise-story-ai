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

export type StoryStatus = "draft" | "processing" | "generated" | "error";
