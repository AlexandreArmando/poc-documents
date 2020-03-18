import { Component, OnInit, Input } from '@angular/core';
import { Camera, CameraOptions } from '@ionic-native/camera/ngx';

@Component({
  selector: 'app-explore-container',
  templateUrl: './explore-container.component.html',
  styleUrls: ['./explore-container.component.scss'],
})
export class ExploreContainerComponent implements OnInit {
  @Input() name: string;

  constructor(private camera: Camera) { }

  ngOnInit() {}

  takePicture() {
    const options : CameraOptions = {
      quality : 100,
      destinationType : this.camera.DestinationType.FILE_URI,
      encodingType : this.camera.EncodingType.JPEG,
      mediaType : this.camera.MediaType.PICTURE
    }

    this.camera.getPicture(options).then((imageData) => {
      let base64Image = 'data:image/jpeg;base64,'+imageData;
      console.log(base64Image);
      
    }, (err) => {
      console.log(err);
    })
  }

}
