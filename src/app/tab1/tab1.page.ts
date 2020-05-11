import { Component, OnInit, Input, ChangeDetectorRef } from "@angular/core";

import {
  Camera,
  CameraOptions,
  PictureSourceType,
} from "@ionic-native/camera/ngx";
import {
  ImageResizer,
  ImageResizerOptions,
} from "@ionic-native/image-resizer/ngx";
import { File, FileEntry } from "@ionic-native/File/ngx";
import { WebView } from "@ionic-native/ionic-webview/ngx";
import { FilePath } from "@ionic-native/file-path/ngx";

import { Platform, ActionSheetController } from "@ionic/angular";
import { Storage } from "@ionic/storage";
import * as jsPDF from 'jspdf';
import { FileOpener } from '@ionic-native/file-opener/ngx';

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { DocumentViewerOptions, DocumentViewer } from '@ionic-native/document-viewer/ngx';
pdfMake.vfs = pdfFonts.pdfMake.vfs;

@Component({
  selector: "app-tab1",
  templateUrl: "tab1.page.html",
  styleUrls: ["tab1.page.scss"],
})
export class Tab1Page implements OnInit {
  images :any;
  imageURI: string;
  STORAGE_KEY = "stored_images";
  loadingController: any;
  size : number = 0;
  resizedImg: string;

  pdfObj = null;

  constructor(
    private camera: Camera,
    private resizer: ImageResizer,
    private platform: Platform,
    private webView: WebView,
    private storage: Storage,
    private file: File,
    private filePath: FilePath,
    private fileOpener: FileOpener,
    private actionSheetController: ActionSheetController,
    private plt: Platform,
    private documentViewer: DocumentViewer
  ) {}

  ngOnInit() {
    this.platform.ready().then(() => {
      console.log("ready");
    });
  }

  pathForImage(img) {
    if (img == null) {
      return "";
    } else {
      return this.webView.convertFileSrc(img);
    }
  }

  

  // IMPORT --------------------------------------------------------
  async selectImages() {
    const actionSheet = await this.actionSheetController.create({
      header: "Select Image source",
      buttons: [
        {
          text: "Load from Library",
          handler: () => {
            this.takePicture(this.camera.PictureSourceType.PHOTOLIBRARY);
          },
        },
        {
          text: "Use Camera",
          handler: () => {
            this.takePicture(this.camera.PictureSourceType.CAMERA);
          },
        },
        {
          text: "Cancel",
          role: "cancel",
        },
      ],
    });
    await actionSheet.present();
  }

  takePicture(sourceType: PictureSourceType) {
    console.log("--- IN TAKE ---");
    var options: CameraOptions = {
      quality: 100,
      destinationType: this.camera.DestinationType.DATA_URL,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE,
      sourceType: sourceType,
      //targetWidth: 500
    };

  
    this.camera.getPicture(options).then((imageData) => {
      pdfMake.vfs = pdfFonts.pdfMake.vfs;
      let base64Image = 'data:image/jpeg;base64,' + imageData;
      var docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [ 0, 0, 0, 0 ],
        content: [
          {
            image: 'document',
            width: 500
          },
        ],
        images: {
          document: base64Image
        }
      }
      this.pdfObj = pdfMake.createPdf(docDefinition);

      this.pdfObj.getBuffer((buffer) => {
        var blob = new Blob([buffer], { type: 'application/pdf' });
        this.file.writeFile(this.file.externalDataDirectory, 'toSend.pdf', blob, { replace: true })
      });
    }) 
  }
}


  // RESIZE -----------------------------------------------------
  // resize() {
  //   console.log("--- IN RESIZE ---");
    
  //   let options = {
  //     uri: this.file.dataDirectory+this.images.name,
  //     quality: 60,
  //     width: 1024,
  //     height: 768
  //   } as ImageResizerOptions;

  //   this.resizer
  //     .resize(options)
  //     .then((filePath: string) => {
  //       console.log("FilePath in resize", filePath);
  //       this.copyFileToLocalDir(
  //         filePath,
  //         filePath,
  //         this.createFileName()
  //       );
  //       this.resizedImg = filePath;
  //     })
  //     .catch((e) => console.log("x--- ERROR IN RESIZE ---"));
  //     console.log("--- OUT RESIZE ---");
  

  // copyFileToLocalDir(namePath, currentName, newFileName) {
  //   console.log("COPY : "+namePath);
    
  //   this.file.copyFile(namePath, currentName, this.file.dataDirectory, newFileName).then(success => {
  //       this.updateStoredImages(newFileName);
  //   }, error => {
  //       console.log("-- ERROR COPY --");
  //   });
  // }
