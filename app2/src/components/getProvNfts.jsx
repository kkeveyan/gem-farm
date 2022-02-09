import React, { Component } from "react";

class Vault extends Component {
    state = {};
    render() {
        const elements = [] //..some array

        const items = []

        for (const [index, value] of elements.entries()) {
            items.push(<Element key={index} />)
        }
        return (
            <>

            </>
        )
    }
}


