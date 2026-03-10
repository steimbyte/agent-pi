# Toolkit Agent Refactor Plan

## Goal
Make toolkit agents represent installed CLI software/integrations rather than fixed model personas. Use a lightweight main worker agent for execution, with the real differentiation coming from the CLI tool each toolkit agent invokes.

## Proposed Approach
- [x] Inspect and preserve the existing standard agent configuration separately from toolkit-specific agents.
- [x] Identify where toolkit agents are currently mapped directly to model/provider pairs.
- [x] Refactor toolkit agent definitions so they describe a CLI-backed integration identity and execution method instead of a model-specific identity.
- [x] Introduce or reuse a shared lightweight worker model for toolkit agent execution, so toolkit agents delegate work through CLI tools rather than through bespoke model assignments.
- [x] Update any model resolution / dispatch code paths so toolkit agents route through the CLI worker flow.
- [x] Adjust related config, sync logic, or tests/docs that assume toolkit agents are model-specific.
- [x] Verify at least one toolkit agent resolves and runs through the new CLI-backed path.
- [ ] The default model is claude-haiku-4-5

## Expected Outcome
- Toolkit agents behave like wrappers for installed software or CLI integrations.
- A main worker agent handles the actual command-line execution.
- Model configuration becomes an implementation detail of the worker, not the identity of the toolkit agent.
