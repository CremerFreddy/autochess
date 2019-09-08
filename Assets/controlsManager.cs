using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class controlsManager : MonoBehaviour
{
    public bool cardSelected;
    public schachbrett brett;
    public Camera cam;
    public schachfeld selectedfield;
    // Start is called before the first frame update
    void Start()
    {
        cardSelected = false;
    }

    // Update is called once per frame
    void Update()
    {
        if(cardSelected)
        {
            RaycastHit hit;
            Ray ray = cam.ScreenPointToRay(Input.mousePosition);
            if (Physics.Raycast(ray, out hit))
            {
                if(hit.collider.tag == "chessfield")
                {
                    if (hit.collider.GetComponent<schachfeld>().Equals(selectedfield))
                    {

                    }
                    else
                    {
                        if(selectedfield != null)
                        {
                            selectedfield.selected = false;
                        }
                        
                        selectedfield = hit.collider.GetComponent<schachfeld>();
                        selectedfield.selected = true;
                    }
                    
                }
                

                // Do something with the object that was hit by the raycast.
            }
        }
        
    }
}
