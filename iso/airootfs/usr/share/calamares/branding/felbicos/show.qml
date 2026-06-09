import QtQuick 2.0
import calamares.slideshow 1.0

Presentation {
    id: presentation
    width: 600
    height: 400

    Timer {
        interval: 10000
        running: true
        repeat: true
        onTriggered: presentation.nextSlide()
    }

    Slide {
        anchors.fill: parent
        Rectangle {
            anchors.fill: parent
            color: "#16122d"
            
            Text {
                text: "AIOS — AI-Native by Design"
                color: "#a855f7"
                font.pointSize: 22
                font.bold: true
                x: 40; y: 60
            }
            Text {
                text: "The first operating system where AI is the core engine, not just a chatbot extension. Every system daemon, filesystem agent, and window compositor natively understands AI intent."
                color: "#e2e8f0"
                font.pointSize: 14
                width: 520
                wrapMode: Text.WordWrap
                x: 40; y: 140
            }
        }
    }

    Slide {
        anchors.fill: parent
        Rectangle {
            anchors.fill: parent
            color: "#16122d"
            
            Text {
                text: "Your Data is Private & Secure"
                color: "#a855f7"
                font.pointSize: 22
                font.bold: true
                x: 40; y: 60
            }
            Text {
                text: "AIOS runs LLM inference completely offline and on-device. All file indexing, voice processing, and screen understanding operate locally with zero cloud telemetry by default. Enforced by hardware LUKS2/TPM2 encryption."
                color: "#e2e8f0"
                font.pointSize: 14
                width: 520
                wrapMode: Text.WordWrap
                x: 40; y: 140
            }
        }
    }

    Slide {
        anchors.fill: parent
        Rectangle {
            anchors.fill: parent
            color: "#16122d"
            
            Text {
                text: "Dual Desktop Session Architecture"
                color: "#a855f7"
                font.pointSize: 22
                font.bold: true
                x: 40; y: 60
            }
            Text {
                text: "A custom wlroots compositor handles two distinct desktop seats concurrently: a traditional, high-fidelity Wayland human workspace, and a secure, sandboxed AI desktop running virtual automation agents."
                color: "#e2e8f0"
                font.pointSize: 14
                width: 520
                wrapMode: Text.WordWrap
                x: 40; y: 140
            }
        }
    }
}
