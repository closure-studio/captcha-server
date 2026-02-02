/**
 * Solver Providers Registry
 *
 * Exports all solver implementations and their handlers.
 */

import { createSolverHandler } from '../handler';
import { aegirSolver } from './aegir';
import { geminiSolver } from './gemini';
import { cloudflareSolver } from './cloudflare';
import { nvidiaSolver } from './nvidia';
import type { Solver, SolverProvider } from '../types';

/** All available solvers */
export const solvers: Record<SolverProvider, Solver> = {
	aegir: aegirSolver,
	gemini: geminiSolver,
	cloudflare: cloudflareSolver,
	nvidia: nvidiaSolver,
};

/** Pre-created handlers for each solver */
export const handlers: Record<SolverProvider, ReturnType<typeof createSolverHandler>> = {
	aegir: createSolverHandler(aegirSolver),
	gemini: createSolverHandler(geminiSolver),
	cloudflare: createSolverHandler(cloudflareSolver),
	nvidia: createSolverHandler(nvidiaSolver),
};

/** Get handler for a provider */
export function getHandler(provider: SolverProvider) {
	return handlers[provider];
}

/** Get solver for a provider */
export function getSolver(provider: SolverProvider) {
	return solvers[provider];
}

/** List of all provider names */
export const providerNames = Object.keys(solvers) as SolverProvider[];
