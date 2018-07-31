import React, { Component } from 'react';
import PropTypes from 'prop-types';

// This component simply displays a (optionally read-only) text input, with a copy
// button attached to it, to easily copy the text to the user's clipboard.
class CopyableTextInput extends Component {
    constructor(props) {
        super(props);
        this.state = { copied: false };
        this.textInput = React.createRef();
    }
    
    _copyText() {
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
            {this.props.label &&
                <label className="label">{this.props.label}</label> 
            }
            <div className="field has-addons">
                <div className="control">
                    <input className="input"
                        type="text"
                        ref={this.textInput}
                        readOnly={this.props.readOnly}
                        value={this.props.value}
                        onClick={() => this._copyText()} />
                </div>
                <div className="control">
                    <button className={this.state.copied ? "button is-success" : "button is-info"} onClick={() => {this._copyText()}}>
                    {this.state.copied && <span className="icon"><i className="fas fa-check"></i></span>}
                    {!this.state.copied && "Copy"}
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
    readOnly: PropTypes.bool
};

export default CopyableTextInput;