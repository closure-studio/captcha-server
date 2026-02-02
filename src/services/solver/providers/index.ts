/**
 * Solver Providers Registry
 *
 * Exports all solver implementations and their handlers.
 */

import { createSolverHandler } from '../handler';
import { aegirSolver } from './aegir';
import { geminiSolver } from './gemini';
import { metaSolver } from './meta';
import type { Solver, SolverProvider } from '../types';

/** All available solvers */
export const solvers: Record<SolverProvider, Solver> = {
	aegir: aegirSolver,
	gemini: geminiSolver,
	meta: metaSolver,
};

/** Pre-created handlers for each solver */
export const handlers: Record<SolverProvider, ReturnType<typeof createSolverHandler>> = {
	aegir: createSolverHandler(aegirSolver),
	gemini: createSolverHandler(geminiSolver),
	meta: createSolverHandler(metaSolver),
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
