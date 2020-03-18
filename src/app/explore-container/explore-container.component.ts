import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';

import { Camera, CameraOptions, PictureSourceType } from '@ionic-native/camera/ngx';
import { ImageResizer, ImageResizerOptions } from '@ionic-native/image-resizer/ngx';
import { File } from '@ionic-native/File/ngx';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { FilePath } from '@ionic-native/file-path/ngx';

import { Platform, ActionSheetController } from '@ionic/angular';
import { Storage } from '@ionic/storage';

@Component({
  selector: 'app-explore-container',
  templateUrl: './explore-container.component.html',
  styleUrls: ['./explore-container.component.scss'],
})
export class ExploreContainerComponent implements OnInit {
  @Input() name: string;

  images = [];
  imageURI : string;
  STORAGE_KEY = 'stored_images';
  
  constructor(
    private camera: Camera, 
    private resizer: ImageResizer, 
    private platform: Platform, 
    private webView : WebView,
    private storage : Storage,
    private file : File,
    private filePath : FilePath,
    private actionSheetController : ActionSheetController,
    private ref: ChangeDetectorRef
    ) { }
  
  ngOnInit() {
    this.platform.ready().then(() => {
      this.loadStoredImages();
    })
  }

  loadStoredImages() {
    this.storage.get(this.STORAGE_KEY).then(images => {
      if(images) {
        let res = JSON.parse(images);
        this.images = [];
        for(let img of images) {
          let filePath = this.file.dataDirectory + img;
          let resPath = this.pathForImage(filePath);
          this.images.push({name: img, path: resPath, filePath: this.filePath})
        }
      }
    }) 
  }

  pathForImage(img) {
    if(img == null) {
      return "";
    } else {
      return this.webView.convertFileSrc(img);
    }
  }

  async selectImages() {
    const actionSheet = await this.actionSheetController.create({
      header: "Select Image source",
        buttons: [{
                text: 'Load from Library',
                handler: () => {
                    this.takePicture(this.camera.PictureSourceType.PHOTOLIBRARY);
                }
            },
            {
                text: 'Use Camera',
                handler: () => {
                    this.takePicture(this.camera.PictureSourceType.CAMERA);
                }
            },
            {
                text: 'Cancel',
                role: 'cancel'
            }
        ]
    });
  
    await actionSheet.present();
  }

  takePicture(sourceType: PictureSourceType) {
    var options: CameraOptions = {
        quality: 100,
        sourceType: sourceType,
        saveToPhotoAlbum: false,
        correctOrientation: true
    };
 
    this.camera.getPicture(options).then(imagePath => {
        if (this.platform.is('android') && sourceType === this.camera.PictureSourceType.PHOTOLIBRARY) {
            this.filePath.resolveNativePath(imagePath)
                .then(filePath => {
                    let correctPath = filePath.substr(0, filePath.lastIndexOf('/') + 1);
                    let currentName = imagePath.substring(imagePath.lastIndexOf('/') + 1, imagePath.lastIndexOf('?'));
                    this.copyFileToLocalDir(correctPath, currentName, this.createFileName());
                });
        } else {
            var currentName = imagePath.substr(imagePath.lastIndexOf('/') + 1);
            var correctPath = imagePath.substr(0, imagePath.lastIndexOf('/') + 1);
            this.copyFileToLocalDir(correctPath, currentName, this.createFileName());
        }
    });
  }

  createFileName() {
    var d = new Date(),
        n = d.getTime(),
        newFileName = n + ".jpg";
    return newFileName;
  }
 
  copyFileToLocalDir(namePath, currentName, newFileName) {
      this.file.copyFile(namePath, currentName, this.file.dataDirectory, newFileName).then(success => {
          this.updateStoredImages(newFileName);
      }, error => {
          console.log(error);
      });
  }
 
  updateStoredImages(name) {
      this.storage.get(this.STORAGE_KEY).then(images => {
          let arr = JSON.parse(images);
          if (!arr) {
              let newImages = [name];
              this.storage.set(this.STORAGE_KEY, JSON.stringify(newImages));
          } else {
              arr.push(name);
              this.storage.set(this.STORAGE_KEY, JSON.stringify(arr));
          }
  
          let filePath = this.file.dataDirectory + name;
          let resPath = this.pathForImage(filePath);
  
          let newEntry = {
              name: name,
              path: resPath,
              filePath: filePath
          };
  
          this.images = [newEntry, ...this.images];
          this.ref.detectChanges(); // trigger change detection cycle
      });
  }

  deleteImage(imgEntry, position) {
    this.images.splice(position, 1);

    this.storage.get(this.STORAGE_KEY).then(images => {
        let arr = JSON.parse(images);
        let filtered = arr.filter(name => name != imgEntry.name);
        this.storage.set(this.STORAGE_KEY, JSON.stringify(filtered));

        var correctPath = imgEntry.filePath.substr(0, imgEntry.filePath.lastIndexOf('/') + 1);

        this.file.removeFile(correctPath, imgEntry.name).then(res => {
            console.log('File removed.');
        });
    });
  }

  resizePicture() {
    let options = {
      uri: this.imageURI,
      folderName: 'Protonet',
      quality: 90,
      width: 1280,
      height: 1280
     } as ImageResizerOptions;
     
     this.resizer
       .resize(options)
       .then((filePath: string) => {
         console.log('FilePath', filePath);
        
        })
       .catch(e => console.log(e));
  }

}
