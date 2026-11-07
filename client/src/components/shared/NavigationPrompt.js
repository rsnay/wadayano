import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useBlocker } from 'react-router-dom';

const PromptContext = createContext(null);

export function NavigationPromptProvider({ children }) {
  const prompts = useRef(new Map());
  const register = useCallback((key, message) => {
    prompts.current.set(key, message);
    return () => prompts.current.delete(key);
  }, []);

  const blocker = useBlocker(
    useCallback(() => {
      const messages = [...new Set(prompts.current.values())];
      return messages.some(message => !window.confirm(message));
    }, [])
  );

  useEffect(() => {
    if (blocker.state === 'blocked') blocker.reset();
  }, [blocker]);

  return <PromptContext.Provider value={register}>{children}</PromptContext.Provider>;
}

NavigationPromptProvider.propTypes = { children: PropTypes.node.isRequired };

export function NavigationPrompt({ when, message }) {
  const register = useContext(PromptContext);
  const key = useRef(Symbol('navigation-prompt'));
  useLayoutEffect(() => {
    if (!register) throw new Error('NavigationPrompt requires NavigationPromptProvider');
    if (when) return register(key.current, message);
    return undefined;
  }, [register, when, message]);
  return null;
}

NavigationPrompt.propTypes = {
  when: PropTypes.bool.isRequired,
  message: PropTypes.string.isRequired,
};
