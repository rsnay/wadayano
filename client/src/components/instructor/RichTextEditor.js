// This file contains TinyMCE configuration for the question prompt and option editors
// These components are currently used in <QuestionEditor>

/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';

// eslint-disable-next-line no-unused-vars
// tinymce import is required but never used by reference, so add eslint exception
/* eslint-disable no-unused-vars */
import tinymce from 'tinymce/tinymce';

// TinyMCE imports and config
import 'tinymce/themes/silver/theme';
import 'tinymce/plugins/autoresize';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/hr';
import 'tinymce/plugins/image';
import 'tinymce/plugins/link';
import 'tinymce/plugins/lists';
import { Editor } from '@tinymce/tinymce-react';

// Main editor configuration
const tinymceConfig = {
  skin_url: '/tinymce/skins/oxide',
  plugins: 'autoresize charmap hr image link lists',
  toolbar:
    'undo redo | bold italic underline | bullist numlist | outdent indent | superscript subscript | hr image link charmap',
  contextmenu: 'cut copy paste | link removeformat',
  formats: {
    h1: { block: 'h1', classes: 'title is-1' },
    h2: { block: 'h2', classes: 'title is-2' },
    h3: { block: 'h3', classes: 'title is-3' },
    h4: { block: 'h4', classes: 'title is-4' },
    h5: { block: 'h5', classes: 'title is-5' },
    h6: { block: 'h6', classes: 'title is-6' },
  },
  menubar: false,
  statusbar: false,
  branding: false,
  autoresize_max_height: 500,
  default_link_target: '_blank',
  target_list: false,
};

// Smaller toolbar on inline editor for options
const tinymceInlineConfig = {
  ...tinymceConfig,
  inline: true,
  toolbar:
    'undo redo | bold italic underline | outdent indent | superscript subscript | image charmap',
};

export function PromptEditor(props) {
  return <Editor init={tinymceConfig} {...props} />;
}

export function OptionEditor(props) {
  return <Editor init={tinymceInlineConfig} {...props} />;
}
