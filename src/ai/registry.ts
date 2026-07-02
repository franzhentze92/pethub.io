import type { AiExecutionContext, AiModuleDefinition, AiToolDefinition } from './types';

class AiModuleRegistry {
  private modules = new Map<string, AiModuleDefinition>();

  register(module: AiModuleDefinition) {
    this.modules.set(module.id, module);
  }

  getModule(id: string) {
    return this.modules.get(id);
  }

  getAllModules(): AiModuleDefinition[] {
    return Array.from(this.modules.values());
  }

  getAllTools(): AiToolDefinition[] {
    return this.getAllModules().flatMap((m) => m.tools);
  }

  getToolsForContext(ctx: AiExecutionContext): AiToolDefinition[] {
    return this.getAllTools().filter((tool) => {
      // Always expose catalog write tools so the LLM can attempt creation;
      // execute() returns a clear error if the user lacks a provider profile.
      if (tool.name.startsWith('catalog_')) return true;
      if (tool.requiresProvider && !ctx.providerId) return false;
      return true;
    });
  }

  getTool(name: string): AiToolDefinition | undefined {
    return this.getAllTools().find((t) => t.name === name);
  }

  /** System prompt fragment listing available capabilities */
  getCapabilitiesSummary(ctx?: AiExecutionContext): string {
    const modules = ctx ? this.getModulesForContext(ctx) : this.getAllModules();
    return modules
      .map(
        (m) =>
          `- ${m.name} (${m.id}): ${m.description}. Herramientas: ${m.tools
            .filter((t) => t.name.startsWith('catalog_') || !t.requiresProvider || ctx.providerId)
            .map((t) => t.name)
            .join(', ')}`
      )
      .join('\n');
  }

  getModulesForContext(ctx: AiExecutionContext): AiModuleDefinition[] {
    return this.getAllModules()
      .map((module) => ({
        ...module,
        tools: module.tools.filter(
          (tool) => tool.name.startsWith('catalog_') || !tool.requiresProvider || ctx.providerId
        ),
      }))
      .filter((module) => module.tools.length > 0);
  }
}

export const aiRegistry = new AiModuleRegistry();
