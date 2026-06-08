import QtQuick 2.15
import calamares.slideshow 1.0

Presentation {
    id: presentation

    Slide {
        Image {
            anchors.fill: parent
            source: "welcome.png"
            fillMode: Image.PreserveAspectCrop
        }
        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.bottom: parent.bottom
            anchors.bottomMargin: 72
            text: "FELBIC OS installs a macOS-like AI-native desktop with local system intelligence."
            color: "white"
            font.pixelSize: 24
            wrapMode: Text.WordWrap
            width: parent.width * 0.78
            horizontalAlignment: Text.AlignHCenter
        }
    }
}
