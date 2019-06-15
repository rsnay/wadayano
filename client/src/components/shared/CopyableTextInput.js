import React, { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * This component simply displays a (optionally read-only) text input, with a copy
 * button attached to it, to easily copy the text to the user's clipboard.
 */
class CopyableTextInput extends Component {
  constructor(props) {
    super(props);
    this.state = { copied: false };
    this.textInput = React.createRef();
  }

  copyText() {
    // iOS complicates copying text
    // From https://stackoverflow.com/a/34046084/702643
    if (!!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform)) {
      const el = this.textInput.current;
      const range = document.createRange();

      el.contenteditable = true;
      el.readonly = false;
      range.selectNodeContents(el);

      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(range);

      el.setSelectionRange(0, 999999); // A big number, to cover anything that could be inside the element.

      el.contentEditable = false;
      el.readOnly = this.props.readOnly;

      document.execCommand('copy');
    }
    try {
      this.textInput.current.select();
      document.execCommand('copy');
      this.setState({ copied: true });
    } catch (error) {
      alert('Press ctrl+c to copy.');
    }
  }

  render() {
    return (
      <div>
        {this.props.label && <label className="label">{this.props.label}</label>}
        <div className="field has-addons">
          <div className="control is-expanded">
            <input
              className="input"
              type="text"
              ref={this.textInput}
              readOnly={this.props.readOnly}
              value={this.props.value}
              onClick={() => this.textInput.current.select()}
            />
          </div>
          <div className="control">
            <button
              className={this.state.copied ? 'button is-success' : 'button is-info'}
              onClick={() => {
                this.copyText();
              }}
              type="button"
            >
              {this.state.copied && (
                <span className="icon">
                  <i className="fas fa-check" />
                </span>
              )}
              {!this.state.copied && 'Copy'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

CopyableTextInput.propTypes = {
  value: PropTypes.string.isRequired,
  label: PropTypes.string,
  readOnly: PropTypes.bool,
};

export default CopyableTextInput;
