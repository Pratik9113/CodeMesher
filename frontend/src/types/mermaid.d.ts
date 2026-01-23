declare module "mermaid" {
  export interface MermaidConfig {
    startOnLoad?: boolean;
    securityLevel?: "strict" | "loose" | "antiscript";
    theme?: "default" | "forest" | "dark" | "neutral";
    themeVariables?: Record<string, string>;
    [key: string]: unknown;
  }

  export interface RenderResult {
    svg: string;
    bindFunctions?: () => void;
  }

  export interface MermaidAPI {
    initialize(config: MermaidConfig): void;
    parse(str: string): void;
    render(id: string, str: string): Promise<RenderResult> | RenderResult;
  }

  const mermaid: MermaidAPI;
  export default mermaid;
}
