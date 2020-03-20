import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';

import { Camera, CameraOptions, PictureSourceType } from '@ionic-native/camera/ngx';
import { ImageResizer, ImageResizerOptions } from '@ionic-native/image-resizer/ngx';
import { File, FileEntry } from '@ionic-native/File/ngx';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { FilePath } from '@ionic-native/file-path/ngx';

import { Platform, ActionSheetController } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { HttpClient } from '@angular/common/http';

import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page implements OnInit {

  images = [];
  imageURI : string;
  STORAGE_KEY = 'stored_images';
  loadingController: any;
  
  constructor(
    private camera: Camera, 
    private resizer: ImageResizer, 
    private platform: Platform, 
    private webView : WebView,
    private storage : Storage,
    private file : File,
    private filePath : FilePath,
    private actionSheetController : ActionSheetController,
    private ref: ChangeDetectorRef,
    private http: HttpClient
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

  // IMPORT --------------------------------------------------------
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
                    console.log("correctpath"+correctPath);
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
        console.log("create :"+newFileName);
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
        console.log("get storage to add");
          let arr = JSON.parse(images);
          console.log(arr);
          if (!arr) {
              let newImages = [name];
              console.log("in if !arr");
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

  deleteImages() {
    console.log("delete");
    
    this.storage.get(this.STORAGE_KEY).then(images => {
      if(images != null) {
        console.log(images);
        
        this.storage.set(this.STORAGE_KEY, null);
        for(let img of images) {
          var correctPath = img.filePath.substr(0, img.filePath.lastIndexOf('/') + 1);
          this.file.removeFile(correctPath, img.name).then(res => {
            console.log('File removed.');
            this.images.splice(img);
          });
        }
      }
    });
  }

  // RESIZE -----------------------------------------------------
  resizeImage(imgEntry, position) {

    this.storage.get(this.STORAGE_KEY).then(images => {
        let arr = JSON.parse(images);
        let filtered = arr.filter(name => name != imgEntry.name);
        this.storage.set(this.STORAGE_KEY, JSON.stringify(filtered));

        var correctPath = imgEntry.filePath.substr(0, imgEntry.filePath.lastIndexOf('/') + 1);

        let options = {
          uri: imgEntry.filePath,
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
        this.getSize(imgEntry);
    });
  }

  // RESIZE -----------------------------------------------------
  getSize(imgEntry) {

    this.storage.get(this.STORAGE_KEY).then(images => {
        let arr = JSON.parse(images);
        let filtered = arr.filter(name => name != imgEntry.name);
        this.storage.set(this.STORAGE_KEY, JSON.stringify(filtered));

        var correctPath = imgEntry.filePath.substr(0, imgEntry.filePath.lastIndexOf('/') + 1);
        console.log("1) "+imgEntry);
        // 2) directory
        console.log("2) "+imgEntry.filePath.substr(0, imgEntry.filePath.lastIndexOf('/') + 1));
        // 3) filename
        console.log("3) "+imgEntry.filePath.substr(imgEntry.filePath.lastIndexOf('/')+1, imgEntry.filePath.length));
        this.startUpload(imgEntry);
    });
  }

  // UPLOAD -------------------------------------------------------------
  startUpload(imgEntry) {
    this.file.resolveDirectoryUrl(imgEntry.filePath.substr(0, imgEntry.filePath.lastIndexOf('/') + 1)).then( resolvedDirectory => {
      resolvedDirectory.getFile(imgEntry.filePath.substr(imgEntry.filePath.lastIndexOf('/')+1, imgEntry.filePath.length), null, 
      (fileEntry) => {
        (<FileEntry>fileEntry).file(file => this.readFile(file));
        
        console.log("got file: " + fileEntry.fullPath);
        
      })
    })
  }
  
  readFile(file: any) {
      const reader = new FileReader();
      reader.onload = () => {
          const formData = new FormData();
          const imgBlob = new Blob([reader.result], {
              type: file.type
          });
          formData.append('file', imgBlob, file.name);
          this.uploadImageData(formData);
      };
      reader.readAsArrayBuffer(file);
  }
  
  async uploadImageData(formData: FormData) {
      const loading = await this.loadingController.create({
          message: 'Uploading image...',
      });
      await loading.present();
  
      this.http.post("http://localhost:8888/upload.php", formData)
          .pipe(
              finalize(() => {
                  loading.dismiss();
              })
          )
          .subscribe(res => {
              if (res['success']) {
                  console.log('File upload complete.')
              } else {
                  console.log('File upload failed.')
              }
          });
  }

}
