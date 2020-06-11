import { Component, OnInit } from "@angular/core";

import {
  Camera,
  CameraOptions,
  PictureSourceType,
} from "@ionic-native/camera/ngx";
import {
  ImageResizer,
  ImageResizerOptions,
} from "@ionic-native/image-resizer/ngx";
import { File } from "@ionic-native/File/ngx";
import { FileOpener } from '@ionic-native/file-opener/ngx';
import { FileTransfer, FileTransferObject } from '@ionic-native/file-transfer/ngx';
import { Base64 } from '@ionic-native/base64/ngx';

import { WIDTH, HEIGHT } from '../const';

import { Platform, ActionSheetController } from "@ionic/angular";
import { Storage } from "@ionic/storage";

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { HTTP } from '@ionic-native/http/ngx';
import { FileChooser } from '@ionic-native/file-chooser/ngx';
pdfMake.vfs = pdfFonts.pdfMake.vfs;

@Component({
  selector: "app-tab1",
  templateUrl: "tab1.page.html",
  styleUrls: ["tab1.page.scss"],
})
export class Tab1Page implements OnInit {
  pdfObj = null;
  imgPath = '';
  loadedImage : HTMLImageElement;
  canvasRealSized: HTMLCanvasElement;
  toSend = '';
  fileTransfer: FileTransferObject;
  pdfSize : number = 0;

  constructor(
    private camera: Camera,
    private resizer: ImageResizer,
    private platform: Platform,
    //private storage: Storage,
    private file: File,
    private transfer: FileTransfer,
    private fileOpener: FileOpener,
    private actionSheetController: ActionSheetController,
    private base64: Base64,
    private fileChooser: FileChooser
  ) {}

  ngOnInit() {
    this.platform.ready().then(() => {
      console.log("ready");
      this.fileTransfer = this.transfer.create();
    });
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
          text: "Load from file",
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

  // Android only
  // Choose directly a pdf file
  chooseFile() {
    this.fileChooser.open()
      .then(uri => console.log(uri))
      // TODO : test if pdf + size
      .catch(e => console.log(e));
  }

  // Take the picture from the camera or the gallery
  takePicture(sourceType: PictureSourceType) {
    var options: CameraOptions = {
      quality: 100,
      destinationType: this.camera.DestinationType.FILE_URI,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE,
      saveToPhotoAlbum: true,
      sourceType: sourceType,
      correctOrientation: true
    };

    this.camera.getPicture(options).then((imageData) => {
      this.imgPath = imageData;
      console.log("Callback of camera plugin :", imageData);
      this.getOrientation(imageData);
    }) 
  }

  // Get the orientation of the picture
  getOrientation(path: string) {
    this.fileToBase64(path).then((base64 : string) => {
      let tmpImg = new Image();
      tmpImg.src = base64;
      tmpImg.onload = (() => {
        if(tmpImg.width == 0 || tmpImg.height == 0){
          this.resizeFile(-1);
        } else if(tmpImg.width>tmpImg.height) {
          console.log("GetOrientation : paysage");
          this.resizeFile(0);
        } else {
          console.log("GetOrientation : portrait");
          this.resizeFile(1);
        }
      });
    });
  }

  /* 
    orientation = 0 -> paysage
    orientation = 1 -> portrait
    -1 error
  */
  resizeFile(orientation : number) {
    console.log("Begin resize by :",orientation);
    
    if(this.imgPath && orientation != null) {
      let options : any;
      switch(orientation) {
        case 0: {
          options = {
            uri: this.imgPath,
            quality: 100,
            width: HEIGHT,
            height: WIDTH
          } as ImageResizerOptions;
          break;
        }
        case 1: {
          options = {
            uri: this.imgPath,
            quality: 100,
            width: WIDTH,
            height: HEIGHT
          } as ImageResizerOptions;
          break;
        }
        case -1: {
          console.log("Orientation error");
          break;
        }
        default : {
          console.log("Error");
          break;
        }
      }
      console.log("options before",options);
      
      
      this.resizer
        .resize(options)
        .then((imagePath: string) => {
          console.log("Resized :", imagePath);
          console.log("options inside",options);
          this.fileToBase64(imagePath).then((base64 : string) => {
            let canvas : HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('preview');
            let ctx : CanvasRenderingContext2D = canvas.getContext('2d');
            ctx.save();

            this.canvasRealSized = document.createElement("canvas");
            let ctxRealSized : CanvasRenderingContext2D = this.canvasRealSized.getContext('2d');
            this.canvasRealSized.width = WIDTH;
            this.canvasRealSized.height = HEIGHT;
            ctxRealSized.save();
            
            this.loadedImage = new Image();
            this.loadedImage.src = base64;

            this.loadedImage.onload = (() => {
              if(this.loadedImage.width > this.loadedImage.height) {
                console.log("paysage");

                ctx.translate(canvas.width/2, canvas.height/2);
                ctx.rotate(Math.PI / 2);
                ctx.drawImage(this.loadedImage, -canvas.height/2, -canvas.width/2, 320, 240);
                ctx.restore();

                ctxRealSized.translate(this.canvasRealSized.width/2, this.canvasRealSized.height/2);
                ctxRealSized.rotate(Math.PI / 2);
                ctxRealSized.drawImage(this.loadedImage, -this.canvasRealSized.height/2, -this.canvasRealSized.width/2, HEIGHT, WIDTH);
                ctxRealSized.restore();
              } else {
                console.log("portrait");

                ctx.translate(0,0);
                ctx.drawImage(this.loadedImage, 0,0, 240, 320);
                ctxRealSized.translate(0,0);
                ctxRealSized.drawImage(this.loadedImage, 0,0);
              }
            });
          })
        }).catch((e) => console.log("x--- ERROR IN RESIZE ---"));
    }
  }

  // Convert image file to base64
  async fileToBase64(imagePath : string) : Promise<string> {
    try {
      const base64File = await this.base64.encodeFile(imagePath);
      console.log("File To Base64 :",base64File);
      return base64File;
    }
    catch (err) {
      console.log(err);
      return "";
    }
  }

  // Convert base64 data to pdf file
  base64ToPDF() {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
    let base64Image = this.canvasRealSized.toDataURL();
    var docDefinition = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [ 0, 0, 0, 0 ], 
      content: [
        {
          image: 'document',
          width: 600
        },
      ],
      images: {
        document: base64Image
      }
    }
    console.log("PDF struct :", docDefinition);
    this.pdfObj = pdfMake.createPdf(docDefinition);
    this.pdfObj.getBuffer((buffer: BlobPart) => {
      var blob = new Blob([buffer], { type: 'application/pdf' });
      this.file.writeFile(this.file.externalDataDirectory, 'toSend.pdf', blob, { replace: true }).then( _ => this.getSize());
    });
  }

  preview() {
    this.fileOpener.open(this.file.externalDataDirectory+'toSend.pdf', 'application/pdf')
    .then(() => console.log('File is opened'))
    .catch(e => console.log('Error opening file', e));
  }

  log(text: string) {
    console.log(text);
    return null;
  }

  // Check the size of the file
  async getSize() {
    try {
      const fileEntry = await this.file.resolveLocalFilesystemUrl(this.file.externalDataDirectory + 'toSend.pdf');
      console.log("Resolved file", fileEntry);
      fileEntry.getMetadata(datas => {
        console.log(datas.size / 1024 / 1024);
        this.pdfSize = datas.size / 1024 / 1024;
      });
    }
    catch (err) {
      console.log('Error while reading file.' + err);
    }
  }

  // Upload files
  send() {
    let options = {
      fileKey: 'file',
      fileName: "toSend.pdf",
      headers: {}
    }
 
   this.fileTransfer.upload(this.file.externalDataDirectory+'toSend.pdf', 'https://dc4ad8bfc9df.ngrok.io', options)
    .then((data) => {
      console.log("Successfully uploaded :", data.response);
    }, (err) => {
      console.log("Successfully uploaded :", err.response);
    })
  }
}